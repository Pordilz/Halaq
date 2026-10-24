import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getScreeningPayload,
  withLivePrice,
  MEMORY_TTL_MS,
  FRESH_TTL_MS,
  STALE_MAX_MS,
} from '../api/_lib/screening-cache.js'

const RAW = JSON.parse(readFileSync(new URL('./fixtures/yahoo/MSFT.json', import.meta.url), 'utf8'))
const HOUR = 60 * 60 * 1000

function fakeStore(initial = {}) {
  const rows = new Map(Object.entries(initial))
  return {
    rows,
    sets: 0,
    async get(t) { return rows.get(t) || null },
    async set(t, payload, fetchedAt) { this.sets++; rows.set(t, { payload, fetchedAt }) },
  }
}

const throttled = () => Object.assign(new Error('Too Many Requests'), { code: 429 })

function harness({ store = fakeStore(), raw = async () => RAW, quote = async () => null, now = 1_000_000_000_000 } = {}) {
  const calls = { raw: 0, quote: 0 }
  const opts = {
    now: () => now,
    store,
    memory: new Map(),
    fetchRaw: async t => { calls.raw++; return raw(t) },
    fetchQuote: async t => { calls.quote++; return quote(t) },
    retryDelayMs: () => 0,
  }
  return { opts, calls, store }
}

describe('getScreeningPayload', () => {
  test('a miss fetches Yahoo, stores the payload and marks it fresh', async () => {
    const { opts, calls, store } = harness()
    const p = await getScreeningPayload('msft', opts)
    assert.equal(calls.raw, 1)
    assert.equal(store.sets, 1)
    assert.equal(p.profile.ticker, 'MSFT')
    assert.equal(p.stale, false)
    assert.ok(p.dataAsOf)
    // The stored copy carries no request-specific flags.
    assert.equal(store.rows.get('MSFT').payload.stale, undefined)
  })

  test('the memory layer answers repeat requests without Yahoo', async () => {
    const { opts, calls } = harness()
    await getScreeningPayload('MSFT', opts)
    await getScreeningPayload('MSFT', opts)
    assert.equal(calls.raw, 1)
    assert.equal(calls.quote, 0)
  })

  test('a fresh shared-cache hit refreshes only the price, scaling market cap', async () => {
    const t0 = 1_000_000_000_000
    const seed = harness({ now: t0 })
    const first = await getScreeningPayload('MSFT', seed.opts)
    const cachedPrice = first.profile.regularMarketPrice

    const { opts, calls } = harness({
      store: seed.store,
      now: t0 + MEMORY_TTL_MS + 1,
      quote: async () => ({ regularMarketPrice: cachedPrice * 1.1, regularMarketChange: 1, regularMarketChangePercent: 0.5 }),
    })
    const p = await getScreeningPayload('MSFT', opts)
    assert.equal(calls.raw, 0)
    assert.equal(calls.quote, 1)
    assert.ok(Math.abs(p.profile.marketCap - first.profile.marketCap * 1.1) < 1)
    assert.equal(p.profile.regularMarketChangePercent, 0.5)
    assert.equal(p.dataAsOf, new Date(t0).toISOString())
  })

  test('an expired shared-cache entry is refetched', async () => {
    const t0 = 1_000_000_000_000
    const seed = harness({ now: t0 })
    await getScreeningPayload('MSFT', seed.opts)
    const { opts, calls } = harness({ store: seed.store, now: t0 + FRESH_TTL_MS + 1 })
    const p = await getScreeningPayload('MSFT', opts)
    assert.equal(calls.raw, 1)
    assert.equal(p.stale, false)
  })

  test('a throttled Yahoo is retried once', async () => {
    let n = 0
    const { opts, calls } = harness({ raw: async () => { if (n++ === 0) throw throttled(); return RAW } })
    const p = await getScreeningPayload('MSFT', opts)
    assert.equal(calls.raw, 2)
    assert.equal(p.stale, false)
  })

  test('if Yahoo stays down, the last good copy is served as stale', async () => {
    const t0 = 1_000_000_000_000
    const seed = harness({ now: t0 })
    await getScreeningPayload('MSFT', seed.opts)
    const { opts } = harness({ store: seed.store, now: t0 + FRESH_TTL_MS + HOUR, raw: async () => { throw throttled() } })
    const p = await getScreeningPayload('MSFT', opts)
    assert.equal(p.stale, true)
    assert.equal(p.dataAsOf, new Date(t0).toISOString())
  })

  test('copies older than the stale window are not served', async () => {
    const t0 = 1_000_000_000_000
    const seed = harness({ now: t0 })
    await getScreeningPayload('MSFT', seed.opts)
    const { opts } = harness({ store: seed.store, now: t0 + STALE_MAX_MS + 1, raw: async () => { throw throttled() } })
    await assert.rejects(getScreeningPayload('MSFT', opts), /Too Many Requests/)
  })

  test('unknown tickers are not retried and never fall back', async () => {
    const { opts, calls } = harness({ raw: async () => { throw new Error('Quote not found for symbol: ZZZZQX') } })
    await assert.rejects(getScreeningPayload('ZZZZQX', opts), /not found/)
    assert.equal(calls.raw, 1)
  })

  test('cache store errors count as misses', async () => {
    const broken = {
      async get() { throw new Error('relation "screening_cache" does not exist') },
      async set() { throw new Error('relation "screening_cache" does not exist') },
    }
    const { opts } = harness({ store: broken })
    assert.equal((await getScreeningPayload('MSFT', opts)).profile.ticker, 'MSFT')
  })

  test('invalid tickers are rejected before any fetch', async () => {
    const { opts, calls } = harness()
    await assert.rejects(getScreeningPayload('../etc', opts), err => err.statusCode === 400)
    assert.equal(calls.raw, 0)
  })
})

test('withLivePrice ignores a missing or bad quote', () => {
  const payload = { profile: { regularMarketPrice: 10, marketCap: 1000 } }
  assert.equal(withLivePrice(payload, null), payload)
  assert.equal(withLivePrice(payload, { regularMarketPrice: 0 }), payload)
  assert.equal(withLivePrice(payload, { regularMarketPrice: 20 }).profile.marketCap, 2000)
})
