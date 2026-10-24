/**
 * Shared Yahoo Finance fetcher used by both Vercel serverless
 * (/api/screen/[ticker].js) and the local Express dev server
 * (server/index.js). Keeps the screening logic in one place.
 */

import YahooFinance from 'yahoo-finance2';
import { numOrNull, extractInterest } from './interest.js';

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
});

// Display fields only — missing becomes 0. Shariah-relevant fields use
// numOrNull so "no data" can't be mistaken for "zero debt".
function num(val) {
  return numOrNull(val) ?? 0;
}

// First positive value, else the first known one (a reported 0), else null.
function pick(...vals) {
  const known = vals.filter(v => v !== null);
  return known.find(v => v > 0) ?? known[0] ?? null;
}

function sumOrNull(...vals) {
  const known = vals.filter(v => v !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
}

const TICKER_PATTERN = /^[A-Z0-9.\-]{1,15}$/;

export function isValidTicker(ticker) {
  return typeof ticker === 'string' && TICKER_PATTERN.test(ticker);
}

export async function fetchScreeningPayload(rawTicker) {
  if (!isValidTicker(rawTicker)) {
    const err = new Error('Invalid ticker format');
    err.statusCode = 400;
    throw err;
  }

  const ticker = rawTicker.toUpperCase();
  return normalizeScreeningPayload(ticker, await fetchRawYahoo(ticker));
}

/**
 * The raw Yahoo responses a screen is built from. Kept separate from
 * normalizeScreeningPayload so tests and scripts can replay recorded data.
 */
export async function fetchRawYahoo(ticker) {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const fifteenMonthsAgo = new Date();
  fifteenMonthsAgo.setMonth(fifteenMonthsAgo.getMonth() - 15);

  // Four Yahoo calls in parallel:
  // - quoteSummary: rich metadata (sector, description, balance sheet, etc.)
  // - fundamentalsTimeSeries (annual, module:'all'): historical balance sheet
  //   + income items. Used for balance-sheet line items (which TTM doesn't
  //   include) and as the income fallback when TTM is unavailable.
  // - fundamentalsTimeSeries (trailing, module:'financials'): trailing-twelve-
  //   months income statement. AAOIFI specifies TTM as the basis for the
  //   haram-income ratio, and using the most recent ANNUAL statement causes
  //   borderline stocks (e.g. SAP at 5.9% annual / 4.8% TTM) to flip across
  //   the 5% threshold unnecessarily. Falls back gracefully to annual on
  //   tickers Yahoo doesn't have TTM data for (smaller listings).
  // - quote (v7): the LIVE price + change snapshot. This matches the source
  //   used by /api/trending and /api/quote, so the hero price on the stock
  //   detail page never disagrees with the trending list the user clicked
  //   through from.
  const [quote, timeSeries, ttmFinancials, liveQuote] = await Promise.all([
    yahooFinance.quoteSummary(
      ticker,
      {
        modules: [
          'assetProfile',
          'summaryDetail',
          'price',
          'defaultKeyStatistics',
          'financialData',
        ],
      },
      { validateResult: false }
    ),
    yahooFinance.fundamentalsTimeSeries(
      ticker,
      {
        period1: twoYearsAgo.toISOString().split('T')[0],
        module: 'all',
      },
      { validateResult: false }
    ),
    yahooFinance
      .fundamentalsTimeSeries(
        ticker,
        {
          period1: fifteenMonthsAgo.toISOString().split('T')[0],
          type: 'trailing',
          module: 'financials',
        },
        { validateResult: false }
      )
      // Graceful fallback — many smaller / non-US listings don't have a
      // populated trailing series and the call returns []. We detect that
      // below and use the annual statement instead.
      .catch(() => null),
    // Don't fail the whole request if the live quote endpoint blips —
    // fall back to quoteSummary's slightly-staler price.
    fetchLiveQuote(ticker).catch(() => null),
  ]);

  return { quote, timeSeries, ttmFinancials, liveQuote };
}

/** One cheap Yahoo call: the live price + change. */
export function fetchLiveQuote(ticker) {
  return yahooFinance.quote(
    ticker,
    {
      fields: [
        'regularMarketPrice',
        'regularMarketChange',
        'regularMarketChangePercent',
      ],
    },
    { validateResult: false }
  );
}

export function normalizeScreeningPayload(ticker, { quote, timeSeries, ttmFinancials, liveQuote }) {
  const priceData = quote.price || {};
  const summaryDetail = quote.summaryDetail || {};
  const assetProfile = quote.assetProfile || {};
  const financialData = quote.financialData || {};
  const live = liveQuote || {};

  // Prefer the live tick when available; fall back to quoteSummary, then
  // financialData.currentPrice as a final resort.
  const livePrice = Number(live.regularMarketPrice);
  const liveChange = Number(live.regularMarketChange);
  const liveChangePct = Number(live.regularMarketChangePercent);

  const profile = {
    ticker,
    name: priceData.longName || priceData.shortName || ticker,
    sector: assetProfile.sector || '',
    industry: assetProfile.industry || '',
    exchange: priceData.exchangeName || priceData.exchange || '',
    marketCap: num(priceData.marketCap),
    currency: priceData.currency || 'USD',
    description: assetProfile.longBusinessSummary || '',
    country: assetProfile.country || '',
    website: assetProfile.website || '',
    employees: num(assetProfile.fullTimeEmployees),
    regularMarketPrice: Number.isFinite(livePrice) && livePrice > 0
      ? livePrice
      : num(priceData.regularMarketPrice ?? financialData.currentPrice),
    regularMarketChange: Number.isFinite(liveChange)
      ? liveChange
      : num(priceData.regularMarketChange),
    regularMarketChangePercent: Number.isFinite(liveChangePct)
      ? liveChangePct
      : num(priceData.regularMarketChangePercent),
    fiftyTwoWeekLow: num(summaryDetail.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: num(summaryDetail.fiftyTwoWeekHigh),
    // Annual dividend per share — pre-fills the purification calculator.
    dividendRate: pick(
      numOrNull(summaryDetail.dividendRate),
      numOrNull(summaryDetail.trailingAnnualDividendRate)
    ),
  };

  const sortedSeries = [...(timeSeries || [])].sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );
  const latestFinancials = sortedSeries[0] || {};
  const latestDate = latestFinancials?.date || null;

  // Pick the most recent TTM row if Yahoo populated one with usable revenue;
  // otherwise fall back to the latest annual row. AAOIFI methodology asks
  // for trailing-twelve-months on the income statement — using last-annual
  // can leave us 11 months stale right before a 10-K drops, which causes
  // borderline issuers to flip across thresholds (see SAP.DE: 5.9% annual
  // vs 4.8% TTM on the haram-income ratio).
  const ttmSorted = Array.isArray(ttmFinancials)
    ? [...ttmFinancials].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    : [];
  const latestTtm = ttmSorted[0] || null;
  const useTtm = !!latestTtm && num(latestTtm.totalRevenue) > 0;
  // `incomeRow` is what we read income-statement line items from below.
  // Balance-sheet line items always come from `latestFinancials` because
  // the TTM module doesn't include balance sheet.
  const incomeRow = useTtm ? latestTtm : latestFinancials;
  const incomeRowDate = useTtm ? latestTtm.date : latestDate;

  const interest = extractInterest(key => numOrNull(incomeRow[key]));

  const totalRevenue =
    num(incomeRow.totalRevenue) || num(financialData.totalRevenue);

  const income = {
    period: incomeRowDate
      ? new Date(incomeRowDate).toISOString().split('T')[0]
      : 'N/A',
    basis: useTtm ? 'TTM' : 'ANNUAL',
    revenue: totalRevenue,
    netIncome:
      num(incomeRow.netIncomeFromContinuingOperations) ||
      num(incomeRow.netIncome),
    grossProfit:
      num(incomeRow.grossProfit) || num(financialData.grossProfits),
    operatingIncome: num(incomeRow.operatingIncome),
    // null when unavailable — the engine treats that as a data gap, never 0%.
    interestIncome: interest.interestIncome,
    interestExpense: interest.interestExpense,
    interestDataSource: interest.dataSource,
  };

  // Balance-sheet line items. When Yahoo has a balance sheet for the period,
  // an omitted line means the company reported none (e.g. no debt), so it
  // counts as 0. With no balance sheet at all, the figures are unknown and
  // stay null — screening them as 0% used to pass stocks on no data.
  const lf = latestFinancials;
  const hasBalanceSheet = numOrNull(lf.totalAssets) > 0;
  const orZeroIfReported = v => v ?? (hasBalanceSheet ? 0 : null);

  // Prefer the line items; financialData.totalCash already includes
  // short-term investments, so it is only a fallback.
  const cashFromLines = sumOrNull(
    numOrNull(lf.cashAndCashEquivalents),
    numOrNull(lf.otherShortTermInvestments)
  );
  const cash = orZeroIfReported(
    cashFromLines > 0 ? cashFromLines : pick(numOrNull(financialData.totalCash), cashFromLines)
  );

  const totalDebt = orZeroIfReported(
    pick(
      numOrNull(lf.totalDebt),
      sumOrNull(numOrNull(lf.currentDebt), numOrNull(lf.longTermDebt)),
      numOrNull(financialData.totalDebt)
    )
  );

  const balanceSheet = {
    period: latestDate
      ? new Date(latestDate).toISOString().split('T')[0]
      : 'N/A',
    totalDebt,
    cashAndShortTermInvestments: cash,
    cashAndCashEquivalents: num(lf.cashAndCashEquivalents),
    netReceivables: orZeroIfReported(
      pick(numOrNull(lf.accountsReceivable), numOrNull(lf.netReceivables))
    ),
    totalAssets: numOrNull(lf.totalAssets),
    totalLiabilities:
      num(latestFinancials.totalLiabilities) ||
      num(latestFinancials.totalLiabilitiesNetMinorityInterest) ||
      num(latestFinancials.totalDebt),
  };

  return { profile, income, balanceSheet };
}

/**
 * Map a Yahoo failure to an HTTP response. yahoo-finance2 throws HTTPError
 * with the upstream status in `err.code`; network failures only have a
 * message. `retryable` failures are retried once and may be answered from a
 * stale cached copy.
 */
export function classifyYahooError(err) {
  const message = String(err?.message || err || '');
  const code = Number(err?.code);

  if (err?.statusCode === 400) {
    return { status: 400, retryable: false, message };
  }
  if (code === 404 || /not found|no fundamentals/i.test(message)) {
    return { status: 404, retryable: false, message: normalizeYahooError(message) };
  }
  if (code === 429 || /too many requests|rate.?limit/i.test(message)) {
    return {
      status: 503,
      retryable: true,
      retryAfter: 60,
      message: 'Our market-data provider is busy right now. Please try again in a minute.',
    };
  }
  if (
    code >= 500 ||
    /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|fetch failed|socket hang up|timed? ?out|network/i.test(message)
  ) {
    return {
      status: 502,
      retryable: true,
      message: 'Market data is temporarily unavailable. Please try again shortly.',
    };
  }
  return { status: 502, retryable: false, message: normalizeYahooError(message) };
}

export function normalizeYahooError(message) {
  if (!message) return 'Unknown error';
  if (/Not Found|no fundamentals/i.test(message)) {
    return 'No data found for that ticker. Check the symbol and try again.';
  }
  if (/Schema|validation/i.test(message)) {
    return 'Yahoo Finance returned unexpected data for this ticker. Limited data may be available — try a different one.';
  }
  return message;
}
