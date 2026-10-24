/**
 * GET /api/etf/:ticker — ETF X-Ray (Pro). See api/_lib/etf.js.
 *
 * Pro-only because one request fans out to up to ten stock screens.
 * Coverage is reported because ten holdings are typically half the fund.
 */

import { isValidTicker, classifyYahooError } from '../_lib/yahoo.js';
import { buildEtfXray } from '../_lib/etf.js';
import { getUserFromToken } from '../_lib/supabase.js';

const PAID_TIERS = new Set(['pro', 'scholar', 'admin']);

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ticker = String(req.query.ticker || '').toUpperCase();
  if (!isValidTicker(ticker)) {
    return res.status(400).json({ error: 'Missing or invalid ticker parameter' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  const { user, profile } = token ? await getUserFromToken(token) : { user: null, profile: null };
  if (!user) return res.status(401).json({ error: 'Sign in to use the ETF X-Ray.' });
  if (!PAID_TIERS.has(profile?.subscription_tier)) {
    return res.status(403).json({ error: 'The ETF X-Ray is a Pro feature.', code: 'UPGRADE_REQUIRED' });
  }

  try {
    const xray = await buildEtfXray(ticker);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).json(xray);
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    if (err.code === 'NOT_A_FUND') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    const { status, message, retryAfter } = classifyYahooError(err);
    console.error(`[etf] error for ${ticker}:`, err.message);
    if (retryAfter) res.setHeader('Retry-After', String(retryAfter));
    return res.status(status).json({ error: message });
  }
}
