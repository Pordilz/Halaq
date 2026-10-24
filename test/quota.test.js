import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  enforceFreeRateLimit,
  enforceAnonRateLimit,
  clientIp,
  hashClientIp,
  FREE_DAILY_LIMIT,
  ANON_DAILY_LIMIT,
} from '../api/_lib/supabase.js'
import { classifyYahooError } from '../api/_lib/yahoo.js'

function fakeAdmin(rpcResult) {
  const calls = { rpc: [], updates: [] }
  return {
    calls,
    async rpc(name, args) { calls.rpc.push({ name, args }); return rpcResult },
    from() {
      return { update: values => ({ eq: async () => { calls.updates.push(values); return { error: null } } }) }
    },
  }
}

const user = { id: 'u1' }
const freeProfile = { subscription_tier: 'free', daily_search_count: 3, daily_search_reset_at: new Date().toISOString() }

describe('free-tier quota', () => {
  test('uses the atomic RPC and blocks when it says no', async () => {
    const admin = fakeAdmin({ data: [{ allowed: false, used: FREE_DAILY_LIMIT }], error: null })
    const r = await enforceFreeRateLimit({ user, profile: freeProfile, admin })
    assert.equal(r.status, 429)
    assert.deepEqual(admin.calls.rpc[0], { name: 'consume_screen_quota', args: { p_user_id: 'u1', p_limit: FREE_DAILY_LIMIT } })
    assert.equal(admin.calls.updates.length, 0)
  })

  test('allows when the RPC allows', async () => {
    const admin = fakeAdmin({ data: [{ allowed: true, used: 4 }], error: null })
    assert.equal(await enforceFreeRateLimit({ user, profile: freeProfile, admin }), null)
  })

  test('paid tiers skip the quota entirely', async () => {
    const admin = fakeAdmin({ data: null, error: null })
    assert.equal(await enforceFreeRateLimit({ user, profile: { subscription_tier: 'pro' }, admin }), null)
    assert.equal(admin.calls.rpc.length, 0)
  })

  test('falls back to the pre-008 check if the RPC is missing', async () => {
    const admin = fakeAdmin({ data: null, error: { message: 'Could not find the function public.consume_screen_quota' } })
    assert.equal(await enforceFreeRateLimit({ user, profile: freeProfile, admin }), null)
    assert.equal(admin.calls.updates[0].daily_search_count, 4)
    const atLimit = { ...freeProfile, daily_search_count: FREE_DAILY_LIMIT }
    assert.equal((await enforceFreeRateLimit({ user, profile: atLimit, admin })).status, 429)
  })
})

describe('anonymous quota', () => {
  const req = { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } }

  test('blocks when the RPC says no, and never sends the raw IP', async () => {
    const admin = fakeAdmin({ data: [{ allowed: false, used: ANON_DAILY_LIMIT }], error: null })
    const r = await enforceAnonRateLimit({ req, admin })
    assert.equal(r.status, 429)
    const { name, args } = admin.calls.rpc[0]
    assert.equal(name, 'consume_anon_quota')
    assert.equal(args.p_limit, ANON_DAILY_LIMIT)
    assert.match(args.p_ip_hash, /^[0-9a-f]{64}$/)
    assert.ok(!args.p_ip_hash.includes('203.0.113.7'))
  })

  test('fails open when the quota store errors', async () => {
    const admin = fakeAdmin({ data: null, error: { message: 'boom' } })
    assert.equal(await enforceAnonRateLimit({ req, admin }), null)
  })

  test('client IP prefers x-real-ip, then the first forwarded hop', () => {
    assert.equal(clientIp({ headers: { 'x-real-ip': '198.51.100.2', 'x-forwarded-for': '1.1.1.1' } }), '198.51.100.2')
    assert.equal(clientIp(req), '203.0.113.7')
    assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '::1' } }), '::1')
    assert.equal(clientIp({ headers: {} }), null)
  })

  test('IP hashes are salted and rotate daily', () => {
    const a = hashClientIp('203.0.113.7', { salt: 's', day: '2026-10-24' })
    assert.equal(a, hashClientIp('203.0.113.7', { salt: 's', day: '2026-10-24' }))
    assert.notEqual(a, hashClientIp('203.0.113.7', { salt: 's', day: '2026-10-25' }))
    assert.notEqual(a, hashClientIp('203.0.113.7', { salt: 't', day: '2026-10-24' }))
  })
})

describe('classifyYahooError', () => {
  test('maps upstream failures to useful HTTP statuses', () => {
    assert.deepEqual(
      [404, 429, 500, 503].map(code => classifyYahooError(Object.assign(new Error('x'), { code })).status),
      [404, 503, 502, 502]
    )
    assert.equal(classifyYahooError(new Error('Quote not found for symbol: ZZZZQX')).status, 404)
    assert.equal(classifyYahooError(new Error('fetch failed')).retryable, true)
    assert.equal(classifyYahooError(Object.assign(new Error('bad'), { statusCode: 400 })).status, 400)
  })

  test('throttling asks the client to retry later', () => {
    const r = classifyYahooError(Object.assign(new Error('Too Many Requests'), { code: 429 }))
    assert.equal(r.retryAfter, 60)
    assert.equal(r.retryable, true)
  })

  test('unknown tickers are not retryable', () => {
    assert.equal(classifyYahooError(new Error('Quote not found for symbol: X')).retryable, false)
  })
})
