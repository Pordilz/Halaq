/**
 * /api/search — proxy to Yahoo Finance symbol search
 * Query: ?q=apple → array of { symbol, name, exchange, type }
 */

import { pickSearchResults } from './_lib/search.js';
import { applyCors } from './_lib/cors.js';
import { enforceSearchRateLimit } from './_lib/supabase.js';

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cheap, fail-closed per-IP limiter so this proxy isn't an unmetered way to
  // drive Yahoo traffic. Repeated identical queries are normally served by
  // the CDN (s-maxage below) before they reach this function, so legitimate
  // autocomplete traffic isn't charged per keystroke here.
  const limited = enforceSearchRateLimit({ req });
  if (limited) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(limited.status).json({ error: limited.error });
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q || q.length < 1 || q.length > 50) {
    return res.status(200).json([]);
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Halaq/1.0 (+https://halaq.app)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();

    return res.status(200).json(pickSearchResults(data?.quotes));
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.error('[Search] Error:', err.message);
    }
    return res.status(200).json([]);
  } finally {
    // Keep the abort signal active until the body is fully read.
    clearTimeout(timeout);
  }
}
