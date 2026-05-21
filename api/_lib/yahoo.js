/**
 * Shared Yahoo Finance fetcher used by both Vercel serverless
 * (/api/screen/[ticker].js) and the local Express dev server
 * (server/index.js). Keeps the screening logic in one place.
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
    yahooFinance
      .quote(
        ticker,
        {
          fields: [
            'regularMarketPrice',
            'regularMarketChange',
            'regularMarketChangePercent',
          ],
        },
        { validateResult: false }
      )
      // Don't fail the whole request if the live quote endpoint blips —
      // fall back to quoteSummary's slightly-staler price.
      .catch(() => null),
  ]);

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
  };

  const sortedSeries = [...timeSeries].sort(
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

  // Interest data field priority (verified across AAPL, MSFT, JNJ):
  //   Most specific:  interestIncome / interestIncomeNonOperating
  //   Broader proxy:  otherNonOperatingIncomeExpenses (AAPL only has this)
  const interestIncome =
    num(incomeRow.interestIncome) ||
    num(incomeRow.interestIncomeNonOperating) ||
    0;

  const interestExpense =
    num(incomeRow.interestExpense) ||
    num(incomeRow.interestExpenseNonOperating) ||
    0;

  const nonOperatingIncome =
    num(incomeRow.otherNonOperatingIncomeExpenses) ||
    num(incomeRow.otherIncomeExpense) ||
    0;

  const debtForEstimate =
    num(latestFinancials.totalDebt) || num(financialData.totalDebt);
  let estimatedInterestExpense = 0;
  let dataSource = 'unavailable';

  if (interestIncome > 0 || interestExpense > 0) {
    dataSource = 'explicit';
  } else if (nonOperatingIncome !== 0) {
    dataSource = 'estimated';
  } else if (debtForEstimate > 0) {
    estimatedInterestExpense = debtForEstimate * 0.05;
    dataSource = 'debt-derived';
  }

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
    interestIncome: interestIncome || Math.max(nonOperatingIncome, 0),
    interestExpense: interestExpense || estimatedInterestExpense,
    interestDataSource: dataSource,
  };

  // `||` binds looser than `+`, so the previous form `(a + b) || totalCash`
  // would silently fall through to financialData.totalCash whenever both
  // line items were 0 — and totalCash already *includes* short-term
  // investments, so the liquidity ratio would be inflated.
  const cashFromLines =
    num(latestFinancials.cashAndCashEquivalents) +
    num(latestFinancials.otherShortTermInvestments);
  const cash = cashFromLines > 0 ? cashFromLines : num(financialData.totalCash);

  const shortTermDebt = num(latestFinancials.currentDebt) || 0;
  const longTermDebt = num(latestFinancials.longTermDebt) || 0;
  const totalDebt =
    num(latestFinancials.totalDebt) ||
    shortTermDebt + longTermDebt ||
    num(financialData.totalDebt);

  const balanceSheet = {
    period: latestDate
      ? new Date(latestDate).toISOString().split('T')[0]
      : 'N/A',
    totalDebt,
    cashAndShortTermInvestments: cash,
    cashAndCashEquivalents: num(latestFinancials.cashAndCashEquivalents),
    netReceivables:
      num(latestFinancials.accountsReceivable) ||
      num(latestFinancials.netReceivables),
    totalAssets: num(latestFinancials.totalAssets),
    totalLiabilities:
      num(latestFinancials.totalLiabilities) ||
      num(latestFinancials.totalLiabilitiesNetMinorityInterest) ||
      num(latestFinancials.totalDebt),
  };

  return { profile, income, balanceSheet };
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
