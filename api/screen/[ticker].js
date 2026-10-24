import { isValidTicker, classifyYahooError } from '../_lib/yahoo.js';
import { getScreeningPayload } from '../_lib/screening-cache.js';
import {
  getUserFromToken,
  enforceFreeRateLimit,
  enforceAnonRateLimit,
} from '../_lib/supabase.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticker: queryTicker } = req.query;
  if (!queryTicker || !isValidTicker(String(queryTicker).toUpperCase())) {
    return res.status(400).json({ error: 'Missing or invalid ticker parameter' });
  }

  const ticker = String(queryTicker).toUpperCase();

  // Signed-in free users share a daily quota; signed-out visitors get a
  // smaller one keyed by a hashed IP (both atomic — migration 008).
  // Responses served from Vercel's CDN cache never reach this function, so
  // repeat views of a popular ticker don't count.
  const token = req.headers.authorization?.replace('Bearer ', '');
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

  try {
    const payload = await getScreeningPayload(ticker);
    // A stale fallback (Yahoo down) shouldn't sit in the CDN for long.
    res.setHeader(
      'Cache-Control',
      payload.stale ? 's-maxage=60' : 's-maxage=300, stale-while-revalidate=900'
    );
    return res.status(200).json(payload);
  } catch (err) {
    const { status, message, retryAfter } = classifyYahooError(err);
    console.error(`[Halaq API] Error screening ${ticker}:`, err.message);
    res.setHeader('Cache-Control', 'no-store');
    if (retryAfter) res.setHeader('Retry-After', String(retryAfter));
    return res.status(status).json({ error: message });
  }
}
