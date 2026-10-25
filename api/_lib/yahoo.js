/**
 * Shared Yahoo Finance fetcher used by both Vercel serverless
 * (/api/screen/[ticker].js) and the local Express dev server
 * (server/index.js). Keeps the screening logic in one place.
 */

import YahooFinance from 'yahoo-finance2';
import { numOrNull, extractInterest } from './interest.js';
import { byDateDesc, yahooDate, yahooDay } from './yahoo-dates.js';
import { majorCurrency, fxPair, toReportingCurrency } from '../../src/services/currency.js';

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
});

// Bump when the payload's meaning changes, so cached copies built by older
// code are refetched (screening-cache.js). 2: market cap converted into the
// reporting currency for the ratios.
export const PAYLOAD_VERSION = 2;

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
  // Plus, once quoteSummary says which currencies are involved, an FX quote
  // when the listing trades in a different currency from the one it reports
  // in (see normalizeScreeningPayload).
  const quoteSummary = yahooFinance.quoteSummary(
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
  );
  const [quote, timeSeries, ttmFinancials, liveQuote, fx] = await Promise.all([
    quoteSummary,
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
    // A failed FX quote leaves the market-cap ratios unavailable rather than
    // failing the screen.
    quoteSummary
      .then(q => {
        const { from, to } = currenciesOf(q);
        return from && to && from !== to ? fetchFxRate(from, to) : null;
      })
      .catch(() => null),
  ]);

  return { quote, timeSeries, ttmFinancials, liveQuote, fx };
}

/** Market-cap currency (major unit of the trading currency) and reporting currency. */
function currenciesOf(quote) {
  return {
    from: majorCurrency(quote?.price?.currency).currency,
    to: majorCurrency(quote?.financialData?.financialCurrency).currency,
  };
}

// FX rates move far less than a screen's thresholds care about in ten
// minutes, and an ETF X-ray screens several holdings in the same currency.
const FX_TTL_MS = 10 * 60 * 1000;
const fxMemo = new Map();

/**
 * The rate that converts `from` into `to` — Yahoo's GBPUSD=X is US dollars
 * per pound — with the inverse pair as a fallback. Resolves
 * { pair, from, to, rate, asOf }, or null when neither quote is usable.
 */
export async function fetchFxRate(from, to) {
  const key = fxPair(from, to);
  const hit = fxMemo.get(key);
  if (hit && Date.now() - hit.at < FX_TTL_MS) return hit.fx;

  let fx = await fetchFxQuote(from, to);
  if (!fx) {
    const inverse = await fetchFxQuote(to, from);
    if (inverse) fx = { ...inverse, from, to, rate: 1 / inverse.rate };
  }
  if (fx) fxMemo.set(key, { fx, at: Date.now() });
  return fx;
}

async function fetchFxQuote(from, to) {
  const pair = fxPair(from, to);
  const q = await yahooFinance
    .quote(pair, { fields: ['regularMarketPrice', 'regularMarketTime', 'currency'] }, { validateResult: false })
    .catch(() => null);
  // An unknown pair resolves undefined rather than throwing.
  const rate = Number(q?.regularMarketPrice);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  if (q.currency && majorCurrency(q.currency).currency !== to) return null;
  return { pair, from, to, rate, asOf: yahooDate(q.regularMarketTime)?.toISOString() ?? null };
}

/**
 * How market cap gets into the reporting currency, as recorded on the
 * payload (profile.fx) and shown with the verdict:
 *   same        — trades and reports in one currency (pence vs pounds counts as one)
 *   converted   — multiplied by `rate`, from Yahoo's `pair` quote at `asOf`
 *   unavailable — the currencies differ and no usable rate was fetched
 *   assumed     — Yahoo omitted one of the two currencies (typically funds,
 *                 which have no financials); treated as the same, as before
 */
function resolveFx(quote, rawFx) {
  const { from, to } = currenciesOf(quote);
  if (!from || !to) return { status: 'assumed', from: from || to, to: to || from, rate: 1 };
  if (from === to) return { status: 'same', from, to, rate: 1 };
  const rate = Number(rawFx?.rate);
  if (rawFx?.from === from && rawFx?.to === to && Number.isFinite(rate) && rate > 0) {
    return { status: 'converted', from, to, rate, pair: rawFx.pair || fxPair(from, to), asOf: rawFx.asOf || null };
  }
  return { status: 'unavailable', from, to, rate: null };
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

export function normalizeScreeningPayload(ticker, { quote, timeSeries, ttmFinancials, liveQuote, fx: rawFx }) {
  const priceData = quote.price || {};
  const summaryDetail = quote.summaryDetail || {};
  const assetProfile = quote.assetProfile || {};
  const financialData = quote.financialData || {};
  const live = liveQuote || {};

  // Statements are in the reporting currency; price.marketCap is in the
  // trading currency's major unit (pounds for a pence-quoted London listing).
  const currency = priceData.currency || 'USD';
  const marketCap = num(priceData.marketCap);
  const marketCapCurrency = majorCurrency(currency).currency;
  const fx = resolveFx(quote, rawFx);
  const sameCurrency = fx.status === 'same' || fx.status === 'assumed';

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
    // 'EQUITY', 'ETF', 'MUTUALFUND' … — funds are screened via their holdings.
    quoteType: priceData.quoteType || null,
    // For display, in marketCapCurrency.
    marketCap,
    marketCapCurrency,
    // What the leverage and liquidity ratios divide by: market cap in the
    // currency the balance sheet is reported in. null when the FX rate
    // couldn't be fetched, so those ratios become data gaps rather than a
    // mixed-currency figure.
    marketCapInReportingCurrency: toReportingCurrency(marketCap, fx),
    fx,
    // Trading currency, the unit of the price fields ('GBp' = pence).
    currency,
    reportingCurrency: fx.to,
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
    // dividendRate is in marketCapCurrency (Shell: 1.16 = £1.16, not 116p);
    // trailingAnnualDividendRate follows the reporting currency (Shell: $1.51),
    // so it's only a fallback when the two currencies match.
    dividendRate: pick(
      numOrNull(summaryDetail.dividendRate),
      sameCurrency ? numOrNull(summaryDetail.trailingAnnualDividendRate) : null
    ),
    dividendCurrency: marketCapCurrency,
  };

  const sortedSeries = [...(timeSeries || [])].sort(byDateDesc);
  const latestFinancials = sortedSeries[0] || {};
  const latestDate = latestFinancials?.date || null;

  // Pick the most recent TTM row if Yahoo populated one with usable revenue;
  // otherwise fall back to the latest annual row. AAOIFI methodology asks
  // for trailing-twelve-months on the income statement — using last-annual
  // can leave us 11 months stale right before a 10-K drops, which causes
  // borderline issuers to flip across thresholds (see SAP.DE: 5.9% annual
  // vs 4.8% TTM on the haram-income ratio).
  const ttmSorted = Array.isArray(ttmFinancials)
    ? [...ttmFinancials].sort(byDateDesc)
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
    period: yahooDay(incomeRowDate),
    basis: useTtm ? 'TTM' : 'ANNUAL',
    currency: fx.to,
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
    period: yahooDay(latestDate),
    currency: fx.to,
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

  return { version: PAYLOAD_VERSION, profile, income, balanceSheet };
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
