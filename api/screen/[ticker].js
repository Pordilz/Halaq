import { isValidTicker, classifyYahooError } from '../_lib/yahoo.js';
import { getScreeningPayload } from '../_lib/screening-cache.js';
import {
  bearerToken,
  getUserFromToken,
  enforceFreeRateLimit,
  enforceAnonRateLimit,
  refundQuota,
} from '../_lib/supabase.js';
import { applyCors } from '../_lib/cors.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cheap syntax validation first: malformed tickers never reach the quota
  // store or Yahoo, so typos can't burn a visitor's daily allowance.
  const { ticker: queryTicker } = req.query;
  if (!queryTicker || !isValidTicker(String(queryTicker).toUpperCase())) {
    return res.status(400).json({ error: 'Missing or invalid ticker parameter' });
  }
  const ticker = String(queryTicker).toUpperCase();

  // Reserve the slot BEFORE any upstream fetch. getScreeningPayload fans out
  // to up to five Yahoo calls (plus a retry), so quota has to gate that work —
  // otherwise an attacker gets unlimited upstream traffic and only sees the
  // 429 after we've paid for it. Responses served from Vercel's CDN cache
  // never reach this function, so repeat views of a popular ticker don't
  // count. Signed-in free users share a daily pool; signed-out visitors get
  // a smaller one keyed by a salted, daily-rotating hash of their IP.
  const token = bearerToken(req);
  const { user, profile } = token ? await getUserFromToken(token) : { user: null, profile: null };
  const blocked = user
    ? await enforceFreeRateLimit({ user, profile })
    : await enforceAnonRateLimit({ req });
  if (blocked) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(blocked.status).json({
      error: blocked.error,
      code: user ? 'QUOTA_FREE' : 'QUOTA_ANON',
    });
  }

  let payload;
  try {
    payload = await getScreeningPayload(ticker);
  } catch (err) {
    // Unknown tickers and Yahoo outages shouldn't cost a free screen. The
    // slot was reserved above, so hand it back before classifying the error.
    // Refund is best-effort; the original 400/404/429→503/502 response and
    // no-store caching are preserved regardless of its outcome.
    await refundQuota({ req, user });

    const { status, message, retryAfter } = classifyYahooError(err);
    console.error(`[Halaq API] Error screening ${ticker}:`, err.message);
    res.setHeader('Cache-Control', 'no-store');
    if (retryAfter) res.setHeader('Retry-After', String(retryAfter));
    return res.status(status).json({ error: message });
  }

  // A stale fallback (Yahoo down) shouldn't sit in the CDN for long.
  res.setHeader(
    'Cache-Control',
    payload.stale ? 's-maxage=60' : 's-maxage=300, stale-while-revalidate=900'
  );
  return res.status(200).json(payload);
}
