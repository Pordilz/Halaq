/**
 * /api/quote/:ticker — fast, cacheable live-price snapshot.
 * Powers the Home dashboard and watchlist tiles. Uses the same Yahoo Finance
 * library as the screener, but only the `price` module so the response is
 * lightweight enough to fan out to dozens of tickers.
 */

import YahooFinance from 'yahoo-finance2'
import { isValidTicker } from '../_lib/yahoo.js'

const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

export const config = { maxDuration: 10 }

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
  const raw = String(req.query.ticker || '').toUpperCase()
  if (!raw || !isValidTicker(raw)) {
    return res.status(400).json({ error: 'Invalid ticker' })
  }
  try {
    // Use yahoo.quote() — the same v7 endpoint /api/trending uses — so the
    // price/change shown on Home + the price/change on StockDetail come from
    // exactly the same source. Previously the page used quoteSummary().price
    // which can lag yahoo.quote() by several minutes, producing visibly
    // different change% between the trending list and the stock-detail hero.
    const q = await yahoo.quote(raw, {
      fields: [
        'regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent',
        'regularMarketPreviousClose', 'regularMarketDayHigh', 'regularMarketDayLow',
        'fiftyTwoWeekLow', 'fiftyTwoWeekHigh', 'longName', 'shortName',
        'currency', 'exchange', 'fullExchangeName', 'marketState',
      ],
    }, { validateResult: false })
    if (!q) {
      return res.status(404).json({ error: 'Quote unavailable' })
    }
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120')
    return res.status(200).json({
      ticker: raw,
      name: q.longName || q.shortName || raw,
      currency: q.currency || 'USD',
      exchange: q.fullExchangeName || q.exchange || '',
      regularMarketPrice: num(q.regularMarketPrice),
      regularMarketChange: num(q.regularMarketChange),
      regularMarketChangePercent: num(q.regularMarketChangePercent),
      previousClose: num(q.regularMarketPreviousClose),
      dayHigh: num(q.regularMarketDayHigh),
      dayLow: num(q.regularMarketDayLow),
      fiftyTwoWeekLow: num(q.fiftyTwoWeekLow),
      fiftyTwoWeekHigh: num(q.fiftyTwoWeekHigh),
      marketState: q.marketState || 'CLOSED',
    })
  } catch (err) {
    console.error('[quote] error:', err.message)
    return res.status(404).json({ error: 'Quote unavailable' })
  }
}
