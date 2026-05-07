/**
 * /api/search — proxy to Yahoo Finance symbol search
 * Query: ?q=apple → array of { symbol, name, exchange, type }
 */

const ALLOWED_EXCHANGES = new Set([
  'NMS', 'NYQ', 'NGM', 'PCX', 'BTS', 'ASE', 'NAS', 'JNB',
]);

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q || q.length < 1 || q.length > 50) {
    return res.status(200).json([]);
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Halaq/1.0 (+https://halaq.app)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();

    const quotes = (data?.quotes || [])
      .filter(item =>
        (item.quoteType === 'EQUITY' || item.quoteType === 'ETF') &&
        (ALLOWED_EXCHANGES.has(item.exchange) || item.symbol?.endsWith('.JO'))
      )
      .slice(0, 8)
      .map(item => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchDisp || item.exchange || '',
        type: item.quoteType,
      }));

    return res.status(200).json(quotes);
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.error('[Search] Error:', err.message);
    }
    return res.status(200).json([]);
  }
}
