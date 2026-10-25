/**
 * Yahoo Finance helpers for the verify-screen path. These calls are heavier
 * than the fast yahoo.js path (additional chart + trailing time-series
 * requests per ticker), so they only run when a user explicitly clicks
 * Verify on a watchlist row.
 *
 * What this adds over the fast path:
 *   - 24-month trailing average market cap (per AAOIFI spec, not spot)
 *   - Trailing-twelve-months (TTM) income statement, not last annual
 *
 * Both reduce spurious verdict flips: spot price volatility no longer
 * trips the leverage ratio on a single bad trading day, and verdicts
 * based on an 11-month-stale annual report get refreshed against the
 * most recent quarter.
 */

import YahooFinance from 'yahoo-finance2';
import { numOrNull, extractInterest } from './interest.js';
import { byDateDesc, yahooDay } from './yahoo-dates.js';

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
});

function num(val) {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

const UNAVAILABLE = { value: 0, monthsObserved: 0, source: 'unavailable' };

/**
 * 24-month trailing average market cap.
 *
 * Scales today's market cap by the ratio of the average monthly close over
 * the last 24 months to today's price — the same as average close × current
 * shares outstanding. Holding the share count fixed is an approximation —
 * but the typical alternative (treasury buybacks, secondary offerings within
 * the window) materially affects this by less than the chart's noise floor
 * for the screening threshold buckets (30% leverage etc.). If we wanted
 * higher fidelity we'd reconstruct shares from monthly `basicAverageShares`
 * in the fundamentals time-series.
 *
 * Units: `marketCap` is in the trading currency's major unit (pounds), while
 * `price` and the chart closes are in its quote unit (pence for 'GBp'). Only
 * the close ÷ price ratio is used, so the minor unit cancels and the result
 * stays in market cap's currency. A chart in a different unit from `currency`
 * is rejected rather than risk a 100× error.
 *
 * Returns { value, monthsObserved, source } so callers can detect cases
 * where Yahoo couldn't supply enough history (newly listed tickers, etc.)
 * and fall back to spot market cap with a confidence penalty.
 */
export async function fetch24MonthAverageMarketCap(ticker, spot) {
  if (!(num(spot?.marketCap) > 0 && num(spot?.price) > 0)) return UNAVAILABLE;

  const twentyFourMonthsAgo = new Date();
  twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);

  try {
    const chart = await yahooFinance.chart(
      ticker,
      {
        period1: twentyFourMonthsAgo.toISOString().split('T')[0],
        interval: '1mo',
      },
      { validateResult: false }
    );
    return averageMarketCapFromChart(chart, spot);
  } catch {
    return UNAVAILABLE;
  }
}

/** The pure part of fetch24MonthAverageMarketCap, for tests. */
export function averageMarketCapFromChart(chart, { marketCap, price, currency }) {
  const chartCurrency = chart?.meta?.currency;
  if (chartCurrency && currency && chartCurrency !== currency) return UNAVAILABLE;

  const quotes = Array.isArray(chart?.quotes) ? chart.quotes : [];
  const validCloses = quotes
    .map(q => num(q?.adjclose ?? q?.close))
    .filter(c => c > 0);

  if (validCloses.length === 0 || !(num(marketCap) > 0 && num(price) > 0)) {
    return UNAVAILABLE;
  }

  const avgClose = validCloses.reduce((sum, c) => sum + c, 0) / validCloses.length;
  return {
    value: marketCap * (avgClose / price),
    monthsObserved: validCloses.length,
    source: validCloses.length >= 18 ? 'yahoo-24m' : 'yahoo-partial',
  };
}

/**
 * Trailing-twelve-months income statement.
 *
 * Yahoo exposes a `type: 'trailing'` mode on fundamentalsTimeSeries that
 * returns precomputed TTM line items. Falls back to summing the last four
 * quarterlies if trailing is empty (some less-covered tickers don't have
 * the trailing series populated), and ultimately to the most recent annual
 * if quarterlies are unavailable too.
 *
 * Returns the same shape the fast yahoo.js adapter produces for `income`,
 * plus a `basis` field ('TTM' | 'QUARTERLY_SUM' | 'ANNUAL') so the UI can
 * show users which they're looking at.
 */
export async function fetchTrailingTwelveMonthIncome(ticker) {
  const fifteenMonthsAgo = new Date();
  fifteenMonthsAgo.setMonth(fifteenMonthsAgo.getMonth() - 15);

  // Try trailing first — single call, most accurate when available.
  try {
    const trailing = await yahooFinance.fundamentalsTimeSeries(
      ticker,
      {
        period1: fifteenMonthsAgo.toISOString().split('T')[0],
        type: 'trailing',
        module: 'financials',
      },
      { validateResult: false }
    );

    const sortedTrailing = Array.isArray(trailing)
      ? [...trailing].sort(byDateDesc)
      : [];
    const latest = sortedTrailing[0];

    if (latest && num(latest.totalRevenue) > 0) {
      return buildIncomeFromRow(latest, 'TTM');
    }
  } catch {
    // fall through to quarterly sum
  }

  // Fall back: sum the last four quarterlies.
  try {
    const quarterly = await yahooFinance.fundamentalsTimeSeries(
      ticker,
      {
        period1: fifteenMonthsAgo.toISOString().split('T')[0],
        type: 'quarterly',
        module: 'financials',
      },
      { validateResult: false }
    );

    const quarters = Array.isArray(quarterly)
      ? [...quarterly].sort(byDateDesc).slice(0, 4)
      : [];

    if (quarters.length === 4) {
      return buildIncomeFromQuarterlySum(quarters);
    }
    if (quarters.length > 0 && quarters.length < 4) {
      // Partial year — sum what we have and tag as such. Better than
      // falling back to a stale annual, but UI should show confidence=LOW.
      return { ...buildIncomeFromQuarterlySum(quarters), basis: 'QUARTERLY_PARTIAL' };
    }
  } catch {
    // fall through to annual
  }

  // Final fallback: most recent annual (matches the fast path).
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  try {
    const annual = await yahooFinance.fundamentalsTimeSeries(
      ticker,
      {
        period1: twoYearsAgo.toISOString().split('T')[0],
        type: 'annual',
        module: 'financials',
      },
      { validateResult: false }
    );
    const sorted = Array.isArray(annual)
      ? [...annual].sort(byDateDesc)
      : [];
    if (sorted[0]) {
      return buildIncomeFromRow(sorted[0], 'ANNUAL');
    }
  } catch {
    // give up — caller will fall back to the fast path's income payload
  }

  return null;
}

function buildIncomeFromRow(row, basis) {
  const interest = extractInterest(key => numOrNull(row[key]));

  return {
    period: yahooDay(row.date),
    revenue: num(row.totalRevenue),
    netIncome:
      num(row.netIncomeFromContinuingOperations) ||
      num(row.netIncome),
    grossProfit: num(row.grossProfit),
    operatingIncome: num(row.operatingIncome),
    interestIncome: interest.interestIncome,
    interestExpense: interest.interestExpense,
    interestDataSource: interest.dataSource,
    basis,
  };
}

function buildIncomeFromQuarterlySum(quarters) {
  // Sum the line items across quarters. A field counts as reported if at
  // least one quarter has it; quarters without it contribute nothing.
  const sum = (key) =>
    quarters.reduce((acc, q) => acc + num(q[key]), 0);
  const sumOrNull = (key) => {
    const vals = quarters.map(q => numOrNull(q[key])).filter(v => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };

  const interest = extractInterest(sumOrNull);

  return {
    period: yahooDay(quarters[0]?.date),
    revenue: sum('totalRevenue'),
    netIncome:
      sum('netIncomeFromContinuingOperations') ||
      sum('netIncome'),
    grossProfit: sum('grossProfit'),
    operatingIncome: sum('operatingIncome'),
    interestIncome: interest.interestIncome,
    interestExpense: interest.interestExpense,
    interestDataSource: interest.dataSource,
    basis: 'QUARTERLY_SUM',
  };
}
