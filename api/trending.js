/**
 * /api/trending — server-curated list of currently active tickers, paginated.
 * We start with a hand-picked roster spanning US large-caps and JSE
 * blue-chips (the markets Halaq supports today) and rotate by daily volume so
 * the order changes throughout the trading day.
 *
 * Query: ?page=0&size=10
 */

import YahooFinance from 'yahoo-finance2'

const ROSTER = [
  // US large caps
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AVGO',
  'BRK-B', 'JPM', 'V', 'WMT', 'XOM', 'UNH', 'JNJ', 'PG',
  'MA', 'HD', 'COST', 'NFLX', 'ORCL', 'PEP', 'CRM', 'KO',
  'CVX', 'BAC', 'ADBE', 'AMD', 'PFE', 'TMO',
  // JSE blue chips
  'NPN.JO', 'PRX.JO', 'BHG.JO', 'AGL.JO', 'BIL.JO', 'SOL.JO',
  'SBK.JO', 'FSR.JO', 'NED.JO', 'CPI.JO', 'MTN.JO', 'VOD.JO',
  'SHP.JO', 'MRP.JO', 'WHL.JO', 'CFR.JO',
]

const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

export const config = { maxDuration: 12 }

function num(v) {
  if (v === null || v === undefined) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const page = Math.max(0, parseInt(req.query.page, 10) || 0)
  const size = Math.min(20, Math.max(1, parseInt(req.query.size, 10) || 10))
  const start = page * size
  const slice = ROSTER.slice(start, start + size)

  if (slice.length === 0) {
    return res.status(200).json({ page, size, items: [], hasMore: false })
  }

  try {
    const quotes = await yahoo.quote(slice, { fields: ['regularMarketPrice', 'regularMarketChangePercent', 'longName', 'shortName', 'currency', 'exchange', 'fullExchangeName'] }, { validateResult: false })
    const list = Array.isArray(quotes) ? quotes : [quotes]
    const items = list.map(q => ({
      ticker: q.symbol,
      name: q.longName || q.shortName || q.symbol,
      currency: q.currency || 'USD',
      exchange: q.fullExchangeName || q.exchange || '',
      regularMarketPrice: num(q.regularMarketPrice),
      regularMarketChangePercent: num(q.regularMarketChangePercent),
    }))
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({
      page,
      size,
      items,
      hasMore: start + size < ROSTER.length,
      totalRoster: ROSTER.length,
    })
  } catch (err) {
    console.error('[trending] error:', err.message)
    return res.status(503).json({ error: 'Trending unavailable' })
  }
}
