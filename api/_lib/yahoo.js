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

  const [quote, timeSeries] = await Promise.all([
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
  ]);

  const priceData = quote.price || {};
  const summaryDetail = quote.summaryDetail || {};
  const assetProfile = quote.assetProfile || {};
  const financialData = quote.financialData || {};

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
    regularMarketPrice: num(priceData.regularMarketPrice ?? financialData.currentPrice),
    regularMarketChange: num(priceData.regularMarketChange),
    regularMarketChangePercent: num(priceData.regularMarketChangePercent),
    fiftyTwoWeekLow: num(summaryDetail.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: num(summaryDetail.fiftyTwoWeekHigh),
  };

  const sortedSeries = [...timeSeries].sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );
  const latestFinancials = sortedSeries[0] || {};
  const latestDate = latestFinancials?.date || null;

  // Interest data field priority (verified across AAPL, MSFT, JNJ):
  //   Most specific:  interestIncome / interestIncomeNonOperating
  //   Broader proxy:  otherNonOperatingIncomeExpenses (AAPL only has this)
  const interestIncome =
    num(latestFinancials.interestIncome) ||
    num(latestFinancials.interestIncomeNonOperating) ||
    0;

  const interestExpense =
    num(latestFinancials.interestExpense) ||
    num(latestFinancials.interestExpenseNonOperating) ||
    0;

  const nonOperatingIncome =
    num(latestFinancials.otherNonOperatingIncomeExpenses) ||
    num(latestFinancials.otherIncomeExpense) ||
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
    num(latestFinancials.totalRevenue) || num(financialData.totalRevenue);

  const income = {
    period: latestDate
      ? new Date(latestDate).toISOString().split('T')[0]
      : 'N/A',
    revenue: totalRevenue,
    netIncome:
      num(latestFinancials.netIncomeFromContinuingOperations) ||
      num(latestFinancials.netIncome),
    grossProfit:
      num(latestFinancials.grossProfit) || num(financialData.grossProfits),
    operatingIncome: num(latestFinancials.operatingIncome),
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
