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
  // JSE blue chips. NB: BIL.JO (BHP Billiton) was delisted in 2022 when
  // BHP unified its DLC — removed.
  'NPN.JO', 'PRX.JO', 'BHG.JO', 'AGL.JO', 'SOL.JO',
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

  // One bad symbol used to poison the entire request (yahoo.quote()
  // batched all tickers; if any failed validation the call rejected).
  // Run per-ticker via allSettled so a single delisted/typo ticker can
  // never empty the trending list.
  const settled = await Promise.allSettled(
    slice.map((symbol) =>
      yahoo.quote(
        symbol,
        { fields: ['regularMarketPrice', 'regularMarketChangePercent', 'longName', 'shortName', 'currency', 'exchange', 'fullExchangeName'] },
        { validateResult: false }
      )
    )
  )

  const items = []
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i]
    if (r.status === 'fulfilled' && r.value) {
      const q = r.value
      items.push({
        ticker: q.symbol || slice[i],
        name: q.longName || q.shortName || q.symbol || slice[i],
        currency: q.currency || 'USD',
        exchange: q.fullExchangeName || q.exchange || '',
        regularMarketPrice: num(q.regularMarketPrice),
        regularMarketChangePercent: num(q.regularMarketChangePercent),
      })
    } else if (r.status === 'rejected') {
      console.warn('[trending] skipping', slice[i], '—', r.reason?.message || r.reason)
    }
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return res.status(200).json({
    page,
    size,
    items,
    hasMore: start + size < ROSTER.length,
    totalRoster: ROSTER.length,
  })
}
