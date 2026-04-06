/**
 * Financial Modeling Prep API Service
 * Fetches company profiles, financial statements, and ratios.
 * Docs: https://site.financialmodelingprep.com/developer/docs
 */

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const API_KEY = import.meta.env.VITE_FMP_API_KEY;

/**
 * Generic fetch helper with error handling
 */
async function fmpFetch(endpoint) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${separator}apikey=${API_KEY}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`FMP API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error(`No data found for this ticker.`);
  }

  return data;
}

/**
 * Get company profile — name, sector, industry, market cap, description, etc.
 * @param {string} ticker e.g. "AAPL" or "SBK.JO"
 * @returns {object} Normalized profile
 */
export async function getCompanyProfile(ticker) {
  const data = await fmpFetch(`/profile/${encodeURIComponent(ticker)}`);
  const profile = Array.isArray(data) ? data[0] : data;

  return {
    ticker: profile.symbol,
    name: profile.companyName,
    sector: profile.sector || '',
    industry: profile.industry || '',
    exchange: profile.exchangeShortName || profile.exchange || '',
    marketCap: profile.mktCap || 0,
    price: profile.price || 0,
    description: profile.description || '',
    country: profile.country || '',
    currency: profile.currency || 'USD',
    image: profile.image || '',
    isEtf: profile.isEtf || false,
    isFund: profile.isFund || false,
  };
}

/**
 * Get the most recent annual income statement
 * @param {string} ticker
 * @returns {object} Normalized income data
 */
export async function getIncomeStatement(ticker) {
  const data = await fmpFetch(`/income-statement/${encodeURIComponent(ticker)}?limit=1`);
  const stmt = Array.isArray(data) ? data[0] : data;

  return {
    period: stmt.date || stmt.period,
    revenue: stmt.revenue || 0,
    netIncome: stmt.netIncome || 0,
    grossProfit: stmt.grossProfit || 0,
    operatingIncome: stmt.operatingIncome || 0,
    interestIncome: stmt.interestIncome || 0,
    interestExpense: stmt.interestExpense || 0,
  };
}

/**
 * Get the most recent annual balance sheet
 * @param {string} ticker
 * @returns {object} Normalized balance sheet data
 */
export async function getBalanceSheet(ticker) {
  const data = await fmpFetch(`/balance-sheet-statement/${encodeURIComponent(ticker)}?limit=1`);
  const bs = Array.isArray(data) ? data[0] : data;

  return {
    period: bs.date || bs.period,
    totalDebt: bs.totalDebt || 0,
    cashAndShortTermInvestments: bs.cashAndShortTermInvestments || 0,
    cashAndCashEquivalents: bs.cashAndCashEquivalents || 0,
    shortTermInvestments: bs.shortTermInvestments || 0,
    netReceivables: bs.netReceivables || 0,
    totalAssets: bs.totalAssets || 0,
    totalLiabilities: bs.totalLiabilities || 0,
    totalStockholdersEquity: bs.totalStockholdersEquity || 0,
  };
}

/**
 * Get key financial metrics (pre-calculated ratios as a backup reference)
 * @param {string} ticker
 * @returns {object}
 */
export async function getKeyMetrics(ticker) {
  const data = await fmpFetch(`/key-metrics/${encodeURIComponent(ticker)}?limit=1`);
  const metrics = Array.isArray(data) ? data[0] : data;

  return {
    period: metrics.date || metrics.period,
    debtToMarketCap: metrics.debtToMarketCap || null,
    marketCap: metrics.marketCap || 0,
    enterpriseValue: metrics.enterpriseValue || 0,
    peRatio: metrics.peRatio || null,
    dividendYield: metrics.dividendYield || null,
  };
}

/**
 * Fetch all data needed for compliance screening in parallel
 * @param {string} ticker
 * @returns {object} { profile, income, balanceSheet, metrics }
 */
export async function fetchAllScreeningData(ticker) {
  const [profile, income, balanceSheet, metrics] = await Promise.all([
    getCompanyProfile(ticker),
    getIncomeStatement(ticker),
    getBalanceSheet(ticker),
    getKeyMetrics(ticker),
  ]);

  return { profile, income, balanceSheet, metrics };
}
