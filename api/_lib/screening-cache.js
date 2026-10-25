/**
 * Cached screening payloads for /api/screen (and anything else that screens
 * on the fast path, e.g. ETF holdings).
 *
 * Two layers in front of Yahoo's four-call fetch:
 *   memory   — per serverless instance, 10 minutes, price included
 *   Supabase — screening_cache (migration 008), shared, 12 hours. Fundamentals
 *              change quarterly; on a hit, one cheap quote call refreshes the
 *              price, and market cap is scaled with it so the ratios track
 *              today's price.
 *
 * A retryable Yahoo failure (throttling, 5xx, network) is retried once; if it
 * still fails, the last good copy up to 7 days old is served with
 * `stale: true`. Cache read/write errors — e.g. before migration 008 is
 * applied — count as misses, so the screen never depends on the cache.
 * So do copies built by older code (a different PAYLOAD_VERSION): those
 * predate the reporting-currency market cap and would screen cross-currency
 * listings like SHEL.L on a mixed-currency ratio, so they're never served,
 * even as a stale fallback.
 *
 * The verify path deliberately bypasses this: Verify always fetches fresh.
 */

import {
  fetchRawYahoo,
  fetchLiveQuote,
  normalizeScreeningPayload,
  classifyYahooError,
  isValidTicker,
  PAYLOAD_VERSION,
} from './yahoo.js';
import { getSupabaseAdmin } from './supabase.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
export const MEMORY_TTL_MS = 10 * MINUTE;
export const FRESH_TTL_MS = 12 * HOUR;
export const STALE_MAX_MS = 7 * 24 * HOUR;
const MEMORY_MAX_ENTRIES = 500;

const sharedMemory = new Map();

export function supabaseCacheStore(admin = getSupabaseAdmin()) {
  if (!admin) return null;
  return {
    async get(ticker) {
      const { data, error } = await admin
        .from('screening_cache')
        .select('payload, fetched_at')
        .eq('ticker', ticker)
        .maybeSingle();
      if (error) throw error;
      return data ? { payload: data.payload, fetchedAt: Date.parse(data.fetched_at) } : null;
    },
    async set(ticker, payload, fetchedAt) {
      const { error } = await admin
        .from('screening_cache')
        .upsert({ ticker, payload, fetched_at: new Date(fetchedAt).toISOString() });
      if (error) throw error;
    },
  };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function withOneRetry(fn, delayMs) {
  try {
    return await fn();
  } catch (err) {
    if (!classifyYahooError(err).retryable) throw err;
    await sleep(delayMs());
    return fn();
  }
}

// Shares outstanding don't move day to day, so market cap scales with price.
// The exchange rate in the reporting-currency figure is kept as cached (up
// to 12 hours old).
export function withLivePrice(payload, live) {
  const price = Number(live?.regularMarketPrice);
  if (!Number.isFinite(price) || price <= 0) return payload;

  const cachedPrice = payload.profile.regularMarketPrice;
  const profile = { ...payload.profile, regularMarketPrice: price };
  const change = Number(live.regularMarketChange);
  const changePercent = Number(live.regularMarketChangePercent);
  if (Number.isFinite(change)) profile.regularMarketChange = change;
  if (Number.isFinite(changePercent)) profile.regularMarketChangePercent = changePercent;
  if (cachedPrice > 0) {
    for (const key of ['marketCap', 'marketCapInReportingCurrency']) {
      if (profile[key] > 0) profile[key] = profile[key] * (price / cachedPrice);
    }
  }
  return { ...payload, profile };
}

function remember(memory, ticker, payload, at) {
  memory.delete(ticker);
  memory.set(ticker, { payload, at });
  if (memory.size > MEMORY_MAX_ENTRIES) memory.delete(memory.keys().next().value);
}

export async function getScreeningPayload(rawTicker, {
  now = Date.now,
  store = supabaseCacheStore(),
  memory = sharedMemory,
  fetchRaw = fetchRawYahoo,
  fetchQuote = fetchLiveQuote,
  retryDelayMs = () => 300 + Math.random() * 500,
} = {}) {
  const ticker = String(rawTicker || '').toUpperCase();
  if (!isValidTicker(ticker)) {
    const err = new Error('Invalid ticker format');
    err.statusCode = 400;
    throw err;
  }

  const t = now();
  const inMemory = memory.get(ticker);
  if (inMemory && t - inMemory.at < MEMORY_TTL_MS) return inMemory.payload;

  let cached = null;
  if (store) {
    try {
      cached = await store.get(ticker);
    } catch (err) {
      console.warn(`[screening-cache] read failed for ${ticker}: ${err.message}`);
    }
  }
  if (cached && cached.payload?.version !== PAYLOAD_VERSION) cached = null;
  const asOf = at => new Date(at).toISOString();

  if (cached && t - cached.fetchedAt < FRESH_TTL_MS) {
    const live = await fetchQuote(ticker).catch(() => null);
    const payload = withLivePrice({ ...cached.payload, dataAsOf: asOf(cached.fetchedAt), stale: false }, live);
    remember(memory, ticker, payload, t);
    return payload;
  }

  try {
    const fresh = normalizeScreeningPayload(ticker, await withOneRetry(() => fetchRaw(ticker), retryDelayMs));
    if (store) {
      try {
        await store.set(ticker, fresh, t);
      } catch (err) {
        console.warn(`[screening-cache] write failed for ${ticker}: ${err.message}`);
      }
    }
    const payload = { ...fresh, dataAsOf: asOf(t), stale: false };
    remember(memory, ticker, payload, t);
    return payload;
  } catch (err) {
    if (classifyYahooError(err).retryable && cached && t - cached.fetchedAt < STALE_MAX_MS) {
      console.warn(`[screening-cache] serving stale ${ticker} (${err.message})`);
      return { ...cached.payload, dataAsOf: asOf(cached.fetchedAt), stale: true };
    }
    throw err;
  }
}
