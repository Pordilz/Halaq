/**
 * POST /api/batch — Pro-only multi-ticker Shariah screening.
 *
 * The browser used to fetch Yahoo data and run the compliance engine itself,
 * which meant both the methodology and the tier gate lived entirely in client
 * code. This endpoint moves that work server-side: the tier is re-read from
 * the DB profile on every request (never trusted from the client), and the
 * profile's methodology is applied here.
 *
 * Rate / abuse considerations:
 *   - Authentication is mandatory and the paid tier is re-checked against the
 *     database on every request, so a free user cannot reach the fan-out by
 *     editing browser state or calling this route directly.
 *   - Each ticker fans out to up to five Yahoo calls (via getScreeningPayload,
 *     which also caches). MAX_TICKERS bounds that to 20 × 5 per request, and
 *     CHUNK_SIZE keeps the concurrent fan-out small enough not to trip Yahoo's
 *     throttling. A smaller cap / chunk size can be tuned without touching the
 *     client. Pro is a paid tier; a per-account request quota could be layered
 *     on later if abuse is observed (the existing screen quota tables are for
 *     the free/anon single-ticker path and deliberately do not throttle Pro).
 *   - A hard per-ticker timeout bounds latency: a hung upstream cannot hold a
 *     serverless invocation open, and there are no unbounded waits or loops.
 *   - Raw upstream errors are never returned (they can disclose ticker
 *     existence and internal details). They are logged server-side only.
 */

import { isValidTicker } from './_lib/yahoo.js';
import { getScreeningPayload } from './_lib/screening-cache.js';
import { getUserFromToken, bearerToken } from './_lib/supabase.js';
import { applyCors } from './_lib/cors.js';
import { screenStock } from '../src/services/complianceEngine.js';

const PAID_TIERS = new Set(['pro', 'scholar', 'admin']);
const MAX_TICKERS = 20;
const CHUNK_SIZE = 4;
const PER_TICKER_TIMEOUT_MS = 12000;
const GENERIC_UPSTREAM_ERROR = 'Market data is temporarily unavailable. Please try again shortly.';

// A paid token alone is not enough to bound this fan-out (20 tickers × ~5
// upstream calls). This in-process, per-account window caps abuse from one
// token on a warm instance; it is deliberately bounded and self-pruning.
// On serverless it is per-instance, not a global hard quota — a hosted limiter
// would be needed for that, but the small window keeps worst-case spend bounded.
const BATCH_WINDOW_MS = 60 * 60 * 1000;
const BATCH_MAX_PER_WINDOW = 30;
const batchUsage = new Map();

function batchRateLimited(userId) {
  const now = Date.now();
  if (batchUsage.size > 5000) {
    for (const [key, value] of batchUsage) {
      if (value.resetAt <= now) batchUsage.delete(key);
    }
  }
  const current = batchUsage.get(userId);
  if (!current || current.resetAt <= now) {
    batchUsage.set(userId, { count: 1, resetAt: now + BATCH_WINDOW_MS });
    return false;
  }
  if (current.count >= BATCH_MAX_PER_WINDOW) return true;
  current.count += 1;
  return false;
}

// Vercel/Express give us up to 30s; 5 chunks × 12s is a bounded worst case, so
// the per-ticker timeout still leaves the handler headroom to answer.
export const config = { maxDuration: 30 };

/**
 * Race a single upstream screen against a deadline. The underlying promise is
 * not cancelled (getScreeningPayload has no abort signal), but the handler
 * never waits on it: its result is ignored if the deadline wins, and the timer
 * is always cleared so it can't keep the event loop alive.
 */
function withTimeout(promise, ms) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('Screening timed out');
      err.name = 'TimeoutError';
      reject(err);
    }, ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Strict bearer parsing + a fresh profile lookup: the tier and methodology
  // come from the DB, not from any client-supplied claim.
  const token = bearerToken(req);
  const { user, profile } = token ? await getUserFromToken(token) : { user: null, profile: null };
  if (!user) return res.status(401).json({ error: 'Sign in to use batch screening.' });
  if (!PAID_TIERS.has(profile?.subscription_tier)) {
    return res.status(403).json({ error: 'Batch screening is a Pro feature.', code: 'UPGRADE_REQUIRED' });
  }
  if (batchRateLimited(user.id)) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', String(Math.ceil(BATCH_WINDOW_MS / 1000)));
    return res.status(429).json({ error: 'Batch rate limit reached. Please try again later.' });
  }

  // Validate the whole list before doing any upstream work. This also keeps
  // the fan-out bounded: a huge array is rejected instead of being screened.
  const body = req.body;
  const rawTickers = body && typeof body === 'object' && !Array.isArray(body) ? body.tickers : null;
  if (!Array.isArray(rawTickers) || rawTickers.length === 0 || rawTickers.length > MAX_TICKERS) {
    return res.status(400).json({ error: `Provide between 1 and ${MAX_TICKERS} tickers.` });
  }

  const tickers = [];
  const seen = new Set();
  for (const raw of rawTickers) {
    const ticker = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
    if (!isValidTicker(ticker)) {
      return res.status(400).json({ error: 'One or more tickers are invalid.' });
    }
    if (!seen.has(ticker)) {
      seen.add(ticker);
      tickers.push(ticker);
    }
  }
  if (tickers.length === 0) {
    return res.status(400).json({ error: 'Provide at least one ticker.' });
  }

  // screenStock falls back to AAOIFI for an unknown methodology key, so even
  // a stale/unexpected DB value yields a safe, deterministic screen.
  const methodology = profile?.methodology;
  const results = new Array(tickers.length);
  const failures = new Array(tickers.length).fill(null);

  // Bounded chunks of CHUNK_SIZE; the number of iterations is at most
  // ceil(MAX_TICKERS / CHUNK_SIZE), so there is no unbounded loop.
  for (let i = 0; i < tickers.length; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, tickers.length);
    const indexes = [];
    for (let j = i; j < end; j += 1) indexes.push(j);

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(indexes.map(async (idx) => {
      try {
        // eslint-disable-next-line no-await-in-loop
        const payload = await withTimeout(getScreeningPayload(tickers[idx]), PER_TICKER_TIMEOUT_MS);
        results[idx] = screenStock(payload.profile, payload.balanceSheet, payload.income, { methodology });
      } catch (err) {
        // Log for operators, return only a generic per-row message to clients.
        console.warn(`[batch] screening failed for ${tickers[idx]}:`, err?.message || err);
        failures[idx] = GENERIC_UPSTREAM_ERROR;
      }
    }));
  }

  const failedCount = failures.filter(Boolean).length;
  res.setHeader('Cache-Control', 'no-store');

  if (failedCount === tickers.length) {
    // The entire batch failed upstream (Yahoo outage / throttling). Do not
    // pretend we have results — signal failure with a generic message.
    return res.status(503).json({ error: GENERIC_UPSTREAM_ERROR });
  }

  // Partial failures are first-class rows, matching the shape the batch table
  // has always rendered (error rows carry ticker + statusReason).
  const shaped = tickers.map((ticker, idx) => (
    failures[idx]
      ? { ticker, error: true, statusReason: failures[idx] }
      : results[idx]
  ));
  return res.status(200).json({ results: shaped });
}
