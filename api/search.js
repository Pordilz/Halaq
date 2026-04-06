/**
 * /api/search — proxy to Yahoo Finance symbol search
 * Query param: ?q=apple  → returns array of { symbol, shortname, exchange, type }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { q } = req.query
  if (!q || q.trim().length < 1) return res.status(200).json([])

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      return res.status(200).json([])
    }

    const data = await response.json()

    // US exchange codes + JSE (Johannesburg Stock Exchange)
    const ALLOWED_EXCHANGES = new Set(['NMS', 'NYQ', 'NGM', 'PCX', 'BTS', 'ASE', 'NAS', 'JNB'])

    const quotes = (data?.quotes || [])
      .filter(q =>
        (q.quoteType === 'EQUITY' || q.quoteType === 'ETF') &&
        (ALLOWED_EXCHANGES.has(q.exchange) || q.symbol?.endsWith('.JO'))
      )
      .slice(0, 6)
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange || '',
        type: q.quoteType,
      }))

    return res.status(200).json(quotes)
  } catch (err) {
    console.error('Search error:', err)
    return res.status(200).json([])
  }
}
