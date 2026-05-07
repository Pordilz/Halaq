import {
  fetchScreeningPayload,
  isValidTicker,
  normalizeYahooError,
} from '../_lib/yahoo.js';
import { getUserFromToken, enforceFreeRateLimit } from '../_lib/supabase.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticker: queryTicker } = req.query;
  if (!queryTicker || !isValidTicker(String(queryTicker).toUpperCase())) {
    return res.status(400).json({ error: 'Missing or invalid ticker parameter' });
  }

  const ticker = String(queryTicker).toUpperCase();

  // Authenticated requests get the daily-screen rate limit. Anonymous browsing
  // is rate-limited by Vercel's edge in front of this function — we don't try
  // to maintain in-memory state in serverless.
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const { user, profile } = await getUserFromToken(token);
    if (user) {
      const blocked = await enforceFreeRateLimit({ user, profile });
      if (blocked) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(blocked.status).json({ error: blocked.error });
      }
    }
  }

  try {
    const payload = await fetchScreeningPayload(ticker);
    res.setHeader(
      'Cache-Control',
      's-maxage=300, stale-while-revalidate=900'
    );
    return res.status(200).json(payload);
  } catch (err) {
    const status = err.statusCode || 400;
    console.error(`[Halaq API] Error screening ${ticker}:`, err.message);
    return res.status(status).json({ error: normalizeYahooError(err.message) });
  }
}
