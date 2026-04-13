/**
 * Shariah Compliance Engine
 * Implements AAOIFI-standard screening: business activity + 4 financial ratios + purification.
 * All functions are pure — no side effects, easy to test.
 */

// ============================================================
// 1. BUSINESS ACTIVITY SCREEN (Qualitative)
// ============================================================

/**
 * Industries that are categorically haram
 */
const HARAM_INDUSTRIES = [
  // Alcohol
  'beverages—brewers', 'beverages—wineries & distilleries', 'beverages - brewers',
  'beverages - wineries & distilleries',
  // Banking & Insurance (conventional / riba-based)
  'banks—diversified', 'banks—regional', 'banks - diversified', 'banks - regional',
  'insurance—diversified', 'insurance—life', 'insurance—property & casualty',
  'insurance—reinsurance', 'insurance—specialty', 'insurance - diversified',
  'insurance - life', 'insurance - property & casualty', 'insurance - reinsurance',
  'insurance - specialty', 'mortgage finance', 'credit services',
  // Gambling
  'gambling', 'casinos & gaming', 'resorts & casinos',
  // Tobacco
  'tobacco',
  // Adult entertainment
  'adult entertainment',
];

const HARAM_SECTORS = [
  // Removed 'financial services' — too broad. Granular industries (banks, insurance)
  // already handle the actual haram sub-sectors. Many fintech/payment companies
  // fall under this sector but are not riba-based.
];

/**
 * Industries that are permissible with caution (<5% haram revenue rule applies)
 */
const CAUTIONARY_INDUSTRIES = [
  'lodging', 'resorts & casinos', 'restaurants', 'hotels',
  'entertainment', 'media—diversified', 'broadcasting',
  'media - diversified', 'department stores', 'discount stores',
  'grocery stores', 'specialty retail',
  'aerospace & defense',
];

const CAUTIONARY_SECTORS = [
  'communication services',
];

/**
 * Screen a company's business activity
 * @param {object} profile — { sector, industry, name }
 * @returns {{ pass: boolean, status: 'PASS'|'FAIL'|'CAUTION', reason: string }}
 */
export function screenBusinessActivity(profile) {
  const sector = (profile.sector || '').toLowerCase().trim();
  const industry = (profile.industry || '').toLowerCase().trim();

  if (!sector && !industry) {
    return {
      pass: false,
      status: 'DOUBTFUL',
      reason: 'Missing business activity information',
      detail: 'Cannot determine Shariah compliance because the sector and industry are not provided in the data source. This often occurs for ETFs, mutual funds, or newly listed entities.',
    };
  }

  // Check haram industries first
  if (HARAM_INDUSTRIES.some(h => (industry && h.includes(industry)) || (industry && industry.includes(h)))) {
    return {
      pass: false,
      status: 'FAIL',
      reason: `Primary business is non-permissible: ${profile.industry}`,
      detail: `The "${profile.industry}" industry involves activities prohibited under Shariah law.`,
    };
  }

  // Check haram sectors
  if (HARAM_SECTORS.some(s => (sector && s.includes(sector)) || (sector && sector.includes(s)))) {
    return {
      pass: false,
      status: 'FAIL',
      reason: `Sector is non-permissible: ${profile.sector}`,
      detail: `The "${profile.sector}" sector primarily involves riba-based (interest) transactions.`,
    };
  }

  // Check cautionary industries
  if (
    CAUTIONARY_INDUSTRIES.some(c => (industry && c.includes(industry)) || (industry && industry.includes(c))) ||
    CAUTIONARY_SECTORS.some(c => (sector && c.includes(sector)) || (sector && sector.includes(c)))
  ) {
    return {
      pass: true,
      status: 'CAUTION',
      reason: `Mixed business — requires <5% haram revenue check`,
      detail: `The "${profile.industry}" industry may include non-permissible revenue streams. The haram income ratio test will determine final compliance.`,
    };
  }

  // Otherwise it's clearly permissible
  return {
    pass: true,
    status: 'PASS',
    reason: `Permissible business activity: ${profile.industry || profile.sector}`,
    detail: `The "${profile.industry || profile.sector}" industry does not involve prohibited activities.`,
  };
}


// ============================================================
// 2. FINANCIAL RATIO SCREEN (Quantitative)
// ============================================================

/**
 * Calculate a single financial ratio test
 * @param {string} name — human-readable name
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} threshold — as decimal, e.g. 0.33 for 33%
 * @param {string} description
 * @returns {object} ratio result
 */
function calculateRatio(name, numerator, denominator, threshold, description) {
  if (!denominator || denominator <= 0) {
    return {
      name,
      pass: false,
      ratio: null,
      threshold,
      thresholdPercent: (threshold * 100).toFixed(0) + '%',
      ratioPercent: 'N/A',
      numerator,
      denominator,
      description,
      error: 'Denominator is zero or unavailable',
    };
  }

  const ratio = numerator / denominator;
  const pass = ratio < threshold;

  return {
    name,
    pass,
    ratio,
    threshold,
    thresholdPercent: (threshold * 100).toFixed(0) + '%',
    ratioPercent: (ratio * 100).toFixed(2) + '%',
    numerator,
    denominator,
    description,
    error: null,
  };
}

/**
 * Run all 4 AAOIFI financial ratio tests
 * @param {object} params
 * @param {number} params.totalDebt
 * @param {number} params.marketCap
 * @param {number} params.cashAndInterestBearing — cash + short-term interest-bearing investments
 * @param {number} params.receivables — accounts receivable / net receivables
 * @param {number} params.haramRevenue — estimated non-permissible revenue
 * @param {number} params.totalRevenue
 * @returns {object} { ratios: [], allPass: boolean }
 */
export function screenFinancialRatios({
  totalDebt,
  marketCap,
  cashAndInterestBearing,
  receivables,
  haramRevenue = 0,
  totalRevenue,
  haramDescription = 'Non-permissible Revenue ÷ Total Revenue must be < 5%',
}) {
  const ratios = [
    calculateRatio(
      'Leverage Ratio',
      totalDebt,
      marketCap,
      0.33,
      'Total Debt ÷ Market Cap must be < 33%'
    ),
    calculateRatio(
      'Liquidity Ratio',
      cashAndInterestBearing,
      marketCap,
      0.33,
      '(Cash + Interest-bearing Securities) ÷ Market Cap must be < 33%'
    ),
    calculateRatio(
      'Receivables Ratio',
      receivables,
      marketCap,
      0.49,
      'Accounts Receivable ÷ Market Cap must be < 49%'
    ),
    calculateRatio(
      'Haram Income Ratio',
      haramRevenue,
      totalRevenue,
      0.05,
      haramDescription
    ),
  ];

  const allPass = ratios.every(r => r.pass);

  return { ratios, allPass };
}


// ============================================================
// 3. PURIFICATION CALCULATION
// ============================================================

/**
 * Calculate the purification (cleansing) amount on dividends
 * @param {number} haramRevenuePercent — e.g. 0.02 for 2%
 * @param {number} dividendReceived — in currency
 * @returns {{ amount: number, description: string }}
 */
export function calculatePurification(haramRevenuePercent, dividendReceived, currency = 'USD') {
  const amount = haramRevenuePercent * dividendReceived;
  const symbol = currency === 'ZAR' ? 'R' : currency === 'GBP' ? '£' : '$';

  return {
    amount: Math.round(amount * 100) / 100, // round to 2 decimals
    percent: haramRevenuePercent,
    percentDisplay: (haramRevenuePercent * 100).toFixed(2) + '%',
    description: amount > 0
      ? `Donate ${symbol}${amount.toFixed(2)} to charity from this dividend`
      : 'No purification required — no haram income detected',
  };
}


// ============================================================
// 4. OVERALL COMPLIANCE VERDICT
// ============================================================

/**
 * @typedef {'COMPLIANT' | 'NON_COMPLIANT' | 'DOUBTFUL'} ComplianceStatus
 */

/**
 * Run the full AAOIFI compliance screening on a stock
 * @param {object} profile — from getCompanyProfile
 * @param {object} balanceSheet — from getBalanceSheet
 * @param {object} income — from getIncomeStatement
 * @returns {object} Full compliance result
 */
export function screenStock(profile, balanceSheet, income) {
  // 1. Business Activity Screen
  const businessScreen = screenBusinessActivity(profile);

  // 2. Financial Ratios
  // Both interest INCOME (riba earned) and interest EXPENSE (riba paid) 
  // are considered non-permissible under AAOIFI standards.
  // We sum them for the most conservative (accurate) estimate.
  const interestIncome = Math.abs(income.interestIncome || 0);
  const interestExpense = Math.abs(income.interestExpense || 0);
  const estimatedHaramRevenue = interestIncome + interestExpense;

  // Build a dynamic description based on data confidence
  const dataSource = income.interestDataSource || 'unknown';
  let haramDescription = 'Non-permissible Revenue ÷ Total Revenue must be < 5%';
  if (dataSource === 'explicit') {
    haramDescription = 'Interest Income + Interest Expense ÷ Total Revenue must be < 5% (from reported financial data)';
  } else if (dataSource === 'estimated') {
    haramDescription = 'Non-operating Income ÷ Total Revenue must be < 5% (estimated — explicit interest data unavailable)';
  } else if (dataSource === 'debt-derived') {
    haramDescription = 'Estimated Interest (Total Debt × 5%) ÷ Total Revenue must be < 5% (derived from debt — no interest data available)';
  }

  const financialScreen = screenFinancialRatios({
    totalDebt: balanceSheet.totalDebt,
    marketCap: profile.marketCap,
    cashAndInterestBearing: balanceSheet.cashAndShortTermInvestments,
    receivables: balanceSheet.netReceivables,
    haramRevenue: estimatedHaramRevenue,
    totalRevenue: income.revenue,
    haramDescription,
  });

  // 3. Determine overall status
  let status = 'COMPLIANT';
  let statusReason = 'All screening criteria passed';

  if (businessScreen.status === 'DOUBTFUL') {
    status = 'DOUBTFUL';
    statusReason = businessScreen.reason;
  } else if (!businessScreen.pass) {
    status = 'NON_COMPLIANT';
    statusReason = businessScreen.reason;
  } else if (!financialScreen.allPass) {
    status = 'NON_COMPLIANT';
    const failedRatios = financialScreen.ratios.filter(r => !r.pass);
    
    // Check if the failure is purely because data was missing (e.g. market cap = 0)
    const hasRealFailures = failedRatios.some(r => !r.error);
    
    if (!hasRealFailures) {
      status = 'DOUBTFUL';
      statusReason = `Cannot verify compliance due to missing financial data for ${failedRatios.length} ratio(s).`;
    } else {
      statusReason = `Failed ${failedRatios.length} financial ratio(s): ${failedRatios.map(r => r.name).join(', ')}`;
    }
  } else if (businessScreen.status === 'CAUTION') {
    status = 'DOUBTFUL';
    statusReason = 'Business activity requires further review — passes financial screens';
  }

  // 4. Purification info
  const haramIncomeRatio = financialScreen.ratios.find(r => r.name === 'Haram Income Ratio');
  const haramPercent = haramIncomeRatio?.ratio || 0;

  return {
    ticker: profile.ticker,
    companyName: profile.name,
    sector: profile.sector,
    industry: profile.industry,
    exchange: profile.exchange,
    marketCap: profile.marketCap,
    currency: profile.currency,

    status,
    statusReason,

    businessScreen,
    financialScreen,

    haramRevenuePercent: haramPercent,
    purificationNote: haramPercent > 0
      ? `${(haramPercent * 100).toFixed(2)}% of dividends should be donated to charity`
      : null,

    dataSources: {
      balanceSheetPeriod: balanceSheet.period,
      incomeStatementPeriod: income.period,
    },

    disclaimer: 'This tool provides a screening framework based on AAOIFI standards. It is not a fatwa. For certainty on specific investments, consult a qualified Islamic finance scholar.',
  };
}
