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

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
});

function num(val) {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 24-month trailing average market cap.
 *
 * Fetches monthly closes for the last 24 months and multiplies by current
 * shares outstanding. Using last-known share count rather than per-month
 * share count is an approximation — but the typical alternative (treasury
 * buybacks, secondary offerings within the window) materially affects this
 * by less than the chart's noise floor for the screening threshold buckets
 * (33% leverage etc.). If we wanted higher fidelity we'd reconstruct shares
 * from monthly `basicAverageShares` in the fundamentals time-series.
 *
 * Returns { value, monthsObserved, source } so callers can detect cases
 * where Yahoo couldn't supply enough history (newly listed tickers, etc.)
 * and fall back to spot market cap with a confidence penalty.
 */
export async function fetch24MonthAverageMarketCap(ticker, sharesOutstanding) {
  const shares = num(sharesOutstanding);
  if (shares <= 0) {
    return { value: 0, monthsObserved: 0, source: 'unavailable' };
  }

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

    const quotes = Array.isArray(chart?.quotes) ? chart.quotes : [];
    const validCloses = quotes
      .map(q => num(q?.adjclose ?? q?.close))
      .filter(c => c > 0);

    if (validCloses.length === 0) {
      return { value: 0, monthsObserved: 0, source: 'unavailable' };
    }

    const avgClose = validCloses.reduce((sum, c) => sum + c, 0) / validCloses.length;
    return {
      value: avgClose * shares,
      monthsObserved: validCloses.length,
      source: validCloses.length >= 18 ? 'yahoo-24m' : 'yahoo-partial',
    };
  } catch {
    return { value: 0, monthsObserved: 0, source: 'unavailable' };
  }
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
      ? [...trailing].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
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
      ? [...quarterly].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 4)
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
      ? [...annual].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
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
  const interestIncome =
    num(row.interestIncome) ||
    num(row.interestIncomeNonOperating) ||
    0;
  const interestExpense =
    num(row.interestExpense) ||
    num(row.interestExpenseNonOperating) ||
    0;
  const nonOperatingIncome =
    num(row.otherNonOperatingIncomeExpenses) ||
    num(row.otherIncomeExpense) ||
    0;

  let dataSource = 'unavailable';
  if (interestIncome > 0 || interestExpense > 0) dataSource = 'explicit';
  else if (nonOperatingIncome !== 0) dataSource = 'estimated';

  return {
    period: row.date ? new Date(row.date).toISOString().split('T')[0] : 'N/A',
    revenue: num(row.totalRevenue),
    netIncome:
      num(row.netIncomeFromContinuingOperations) ||
      num(row.netIncome),
    grossProfit: num(row.grossProfit),
    operatingIncome: num(row.operatingIncome),
    interestIncome: interestIncome || Math.max(nonOperatingIncome, 0),
    interestExpense,
    interestDataSource: dataSource,
    basis,
  };
}

function buildIncomeFromQuarterlySum(quarters) {
  // Sum the line items across quarters. interestDataSource is 'explicit'
  // only if at least one quarter reported it explicitly — partial
  // explicitness is still better than the debt-derived estimate.
  const sum = (key) =>
    quarters.reduce((acc, q) => acc + num(q[key]), 0);

  const interestIncome =
    sum('interestIncome') ||
    sum('interestIncomeNonOperating') ||
    0;
  const interestExpense =
    sum('interestExpense') ||
    sum('interestExpenseNonOperating') ||
    0;
  const nonOperatingIncome =
    sum('otherNonOperatingIncomeExpenses') ||
    sum('otherIncomeExpense') ||
    0;

  let dataSource = 'unavailable';
  if (interestIncome > 0 || interestExpense > 0) dataSource = 'explicit';
  else if (nonOperatingIncome !== 0) dataSource = 'estimated';

  return {
    period: quarters[0]?.date
      ? new Date(quarters[0].date).toISOString().split('T')[0]
      : 'N/A',
    revenue: sum('totalRevenue'),
    netIncome:
      sum('netIncomeFromContinuingOperations') ||
      sum('netIncome'),
    grossProfit: sum('grossProfit'),
    operatingIncome: sum('operatingIncome'),
    interestIncome: interestIncome || Math.max(nonOperatingIncome, 0),
    interestExpense,
    interestDataSource: dataSource,
    basis: 'QUARTERLY_SUM',
  };
}
