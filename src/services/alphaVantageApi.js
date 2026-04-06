/**
 * Alpha Vantage API Service
 * Fetches company profiles and financial statements.
 * Docs: https://www.alphavantage.co/documentation/
 */

const BASE_URL = 'https://www.alphavantage.co/query';
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;

/**
 * Generic fetch helper with error handling
 */
async function avFetch(functionName, ticker) {
  const url = `${BASE_URL}?function=${functionName}&symbol=${ticker}&apikey=${API_KEY}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Alpha Vantage API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Alpha Vantage returns 'Information' or 'Note' on limit reached
  if (data.Information || data.Note) {
    throw new Error(`API Limit Reached: ${data.Information || data.Note}`);
  }

  // Alpha Vantage returns 'Error Message' on invalid calls
  if (data['Error Message']) {
    throw new Error(`API Error: ${data['Error Message']}`);
  }

  return data;
}

/**
 * Parse AV numeric string (handles "None" and string numbers)
 */
function parseNum(val) {
  if (!val || val === 'None') return 0;
  return parseFloat(val) || 0;
}

/**
 * Get company profile (OVERVIEW) — name, sector, industry, market cap.
 * @param {string} ticker
 * @returns {object} Normalized profile
 */
export async function getCompanyProfile(ticker) {
  const data = await avFetch('OVERVIEW', ticker);
  
  if (!data.Symbol) {
    throw new Error(`No overview data found for ticker ${ticker}.`);
  }

  return {
    ticker: data.Symbol,
    name: data.Name,
    sector: data.Sector || '',
    industry: data.Industry || '',
    exchange: data.Exchange || '',
    marketCap: parseNum(data.MarketCapitalization),
    currency: data.Currency || 'USD',
    description: data.Description || '',
    country: data.Country || '',
  };
}

/**
 * Get the most recent annual income statement
 * @param {string} ticker
 * @returns {object} Normalized income data
 */
export async function getIncomeStatement(ticker) {
  const data = await avFetch('INCOME_STATEMENT', ticker);
  
  if (!data.annualReports || data.annualReports.length === 0) {
    throw new Error(`No income statement data found for ${ticker}.`);
  }

  const stmt = data.annualReports[0];

  return {
    period: stmt.fiscalDateEnding,
    revenue: parseNum(stmt.totalRevenue),
    netIncome: parseNum(stmt.netIncome),
    grossProfit: parseNum(stmt.grossProfit),
    operatingIncome: parseNum(stmt.operatingIncome),
    interestIncome: parseNum(stmt.interestIncome) || parseNum(stmt.investmentIncomeNet), // fallback to investment income if interest is null
    interestExpense: parseNum(stmt.interestExpense),
  };
}

/**
 * Get the most recent annual balance sheet
 * @param {string} ticker
 * @returns {object} Normalized balance sheet data
 */
export async function getBalanceSheet(ticker) {
  const data = await avFetch('BALANCE_SHEET', ticker);
  
  if (!data.annualReports || data.annualReports.length === 0) {
    throw new Error(`No balance sheet data found for ${ticker}.`);
  }

  const bs = data.annualReports[0];
  
  const shortTermDebt = parseNum(bs.shortTermDebt);
  const longTermDebt = parseNum(bs.longTermDebt);
  const cash = parseNum(bs.cashAndShortTermInvestments) || parseNum(bs.cashAndCashEquivalentsAtCarryingValue);

  return {
    period: bs.fiscalDateEnding,
    totalDebt: shortTermDebt + longTermDebt,
    cashAndShortTermInvestments: cash,
    cashAndCashEquivalents: cash,
    netReceivables: parseNum(bs.currentNetReceivables),
    totalAssets: parseNum(bs.totalAssets),
    totalLiabilities: parseNum(bs.totalLiabilities),
  };
}

/**
 * Fetch all data needed for compliance screening in parallel
 * Note: AV free tier is 25 calls/day. Here we make 3 calls at once.
 * @param {string} ticker
 * @returns {object} { profile, income, balanceSheet }
 */
export async function fetchAllScreeningData(ticker) {
  const [profile, income, balanceSheet] = await Promise.all([
    getCompanyProfile(ticker),
    getIncomeStatement(ticker),
    getBalanceSheet(ticker),
  ]);

  return { profile, income, balanceSheet };
}
