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
    const quote = await yahoo.quoteSummary(raw, {
      modules: ['price', 'summaryDetail'],
    }, { validateResult: false })
    const price = quote.price || {}
    const summary = quote.summaryDetail || {}
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120')
    return res.status(200).json({
      ticker: raw,
      name: price.longName || price.shortName || raw,
      currency: price.currency || 'USD',
      exchange: price.exchangeName || price.exchange || '',
      regularMarketPrice: num(price.regularMarketPrice),
      regularMarketChange: num(price.regularMarketChange),
      regularMarketChangePercent: num(price.regularMarketChangePercent),
      previousClose: num(price.regularMarketPreviousClose),
      dayHigh: num(summary.dayHigh),
      dayLow: num(summary.dayLow),
      fiftyTwoWeekLow: num(summary.fiftyTwoWeekLow),
      fiftyTwoWeekHigh: num(summary.fiftyTwoWeekHigh),
      marketState: price.marketState || 'CLOSED',
    })
  } catch (err) {
    console.error('[quote] error:', err.message)
    return res.status(404).json({ error: 'Quote unavailable' })
  }
}
