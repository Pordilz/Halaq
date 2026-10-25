/**
 * Currency helpers shared by the API (api/_lib) and the browser.
 *
 * Yahoo reports a company's balance sheet and income statement in its
 * reporting currency (`financialData.financialCurrency`), but its market cap
 * and price in the listing's trading currency (`price.currency`). Shell
 * trades in London in pence and reports in US dollars; TSMC's ADR trades in
 * dollars and reports in Taiwan dollars. Ratios that divide one by the other
 * need both in one currency.
 */

// Exchanges that quote in a minor unit. Prices and chart closes use the
// minor unit; Yahoo's price.marketCap and summaryDetail.dividendRate are
// already in the major one (checked against live data on 2026-10-25).
const MINOR_UNITS = {
  GBp: { currency: 'GBP', divisor: 100 },   // London, pence
  GBX: { currency: 'GBP', divisor: 100 },
  ZAc: { currency: 'ZAR', divisor: 100 },   // Johannesburg, cents
  ZAC: { currency: 'ZAR', divisor: 100 },
  ILA: { currency: 'ILS', divisor: 100 },   // Tel Aviv, agorot
  KWF: { currency: 'KWD', divisor: 1000 },  // Boursa Kuwait, fils
}

/**
 * The major currency behind a Yahoo currency code, and what to divide a
 * minor-unit amount by to get there. Codes are case-sensitive: 'GBp' is
 * pence, 'GBP' is pounds. Unknown or missing codes return currency null.
 */
export function majorCurrency(code) {
  if (!code || typeof code !== 'string') return { currency: null, divisor: 1 }
  return MINOR_UNITS[code] || { currency: code.toUpperCase(), divisor: 1 }
}

/** Yahoo's symbol for the rate that converts `from` into `to`, e.g. GBPUSD=X. */
export function fxPair(from, to) {
  return `${from}${to}=X`
}

/**
 * Convert an amount in the market-cap currency into the reporting currency
 * using a payload's `fx` record. Returns null when the conversion is unknown
 * (rate unavailable), so callers never mix currencies silently.
 */
export function toReportingCurrency(amount, fx) {
  if (amount == null || !Number.isFinite(amount)) return null
  if (!fx) return amount
  if (fx.status === 'same' || fx.status === 'assumed') return amount
  if (fx.status === 'converted' && Number.isFinite(fx.rate) && fx.rate > 0) return amount * fx.rate
  return null
}
