/**
 * /api/verify-screen/:ticker
 *
 * Authoritative re-screen for a single watchlist ticker. Pulls from
 * multiple sources (Yahoo fast + 24-month avg market cap + TTM income +
 * SEC EDGAR for US tickers) and persists the result with confidence and
 * provenance to the user's watchlist row.
 *
 * Authorisation:
 *   - Requires a valid Supabase session token (no anonymous calls — this
 *     endpoint mutates user state).
 *   - Ticker must already be in the caller's watchlist. Without this guard
 *     anyone could trigger expensive multi-source fetches for arbitrary
 *     tickers; the watchlist gate keeps the cost surface bounded to what
 *     the user has shown intent to track.
 *
 * Rate limit:
 *   - Counts against the same free-tier daily pool as /api/screen (50/day).
 *     A verify is just a heavier screen — same operation class from the
 *     user's perspective. Pro/Scholar tiers have no limit.
 *
 * Cache: no-store. Verify is the user explicitly asking for a fresh,
 * source-verified verdict — caching the response would defeat the purpose.
 */

import { isValidTicker, normalizeYahooError } from '../_lib/yahoo.js';
import { buildVerifiedScreening } from '../_lib/verify-screen.js';
import { getUserFromToken, enforceFreeRateLimit, getSupabaseAdmin } from '../_lib/supabase.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticker: queryTicker } = req.query;
  if (!queryTicker || !isValidTicker(String(queryTicker).toUpperCase())) {
    return res.status(400).json({ error: 'Missing or invalid ticker parameter' });
  }
  const ticker = String(queryTicker).toUpperCase();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Sign in to verify a stock.' });

  const { user, profile } = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid session.' });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(503).json({ error: 'Verification service unavailable.' });
  }

  // Watchlist gate — verify is for stocks the user is tracking.
  const { data: watchRow, error: watchErr } = await admin
    .from('watchlist')
    .select('id')
    .eq('user_id', user.id)
    .eq('ticker', ticker)
    .maybeSingle();
  if (watchErr) {
    console.error(`[verify-screen] watchlist lookup failed for ${ticker}:`, watchErr);
    return res.status(500).json({ error: 'Could not verify watchlist membership.' });
  }
  if (!watchRow) {
    return res.status(403).json({
      error: 'Add this stock to your watchlist before verifying.',
    });
  }

  // Rate limit — verify shares the daily-screen pool for free users.
  const blocked = await enforceFreeRateLimit({ user, profile });
  if (blocked) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(blocked.status).json({ error: blocked.error });
  }

  // Methodology is a Pro+ setting; free users always verify under AAOIFI.
  const isPro = profile?.subscription_tier && profile.subscription_tier !== 'free';
  const methodology = isPro && profile?.methodology ? profile.methodology : 'AAOIFI';

  try {
    const result = await buildVerifiedScreening(ticker, methodology);

    // Persist status + provenance to the watchlist row. The data_sources_used
    // and confidence columns came in via migration 007. Failures here are
    // non-fatal — the user still gets the verdict in the response.
    try {
      await admin
        .from('watchlist')
        .update({
          status: result.status,
          confidence: result.confidence,
          data_sources_used: result.verification,
          screened_at: result.verification?.verifiedAt || new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('ticker', ticker);
    } catch (persistErr) {
      console.warn(`[verify-screen] persist failed for ${user.id}/${ticker}:`, persistErr);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (err) {
    console.error(`[verify-screen] error for ${ticker}:`, err.message || err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: normalizeYahooError(err.message || 'Verification failed') });
  }
}
