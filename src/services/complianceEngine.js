/**
 * Halaq Shariah compliance engine.
 *
 * Implements the qualitative business-activity screen and the quantitative
 * financial-ratio screen on top of normalised profile + balance-sheet + income
 * data, plus a purification calculator. Pure functions, easy to unit-test.
 *
 * Methodologies supported (thresholds vary slightly between scholars):
 *   - AAOIFI (default)
 *   - DJIM   (Dow Jones Islamic Market)
 *   - SP     (S&P Global Shariah)
 *   - FTSE   (FTSE Shariah)
 *
 * Disclaimer: this is screening guidance, not a fatwa. Consult a qualified
 * scholar for personal rulings.
 */

// ============================================================
// 0. CONSTANTS
// ============================================================

export const METHODOLOGY_KEYS = ['AAOIFI', 'DJIM', 'SP', 'FTSE']

const METHODOLOGIES = {
  AAOIFI: {
    label: 'AAOIFI',
    description: 'Accounting & Auditing Organization for Islamic Financial Institutions',
    thresholds: {
      leverage: 0.33,        // total debt / market cap
      liquidity: 0.33,       // (cash + interest-bearing securities) / market cap
      receivables: 0.49,     // accounts receivable / market cap
      haramRevenue: 0.05,    // non-permissible revenue / total revenue
    },
    leverageDenominator: 'marketCap',
    liquidityDenominator: 'marketCap',
    receivablesDenominator: 'marketCap',
  },
  DJIM: {
    label: 'Dow Jones Islamic Market',
    description: 'Dow Jones Islamic Market Index methodology',
    thresholds: {
      leverage: 0.33,
      liquidity: 0.33,
      receivables: 0.33,
      haramRevenue: 0.05,
    },
    leverageDenominator: 'marketCap',
    liquidityDenominator: 'marketCap',
    receivablesDenominator: 'marketCap',
  },
  SP: {
    label: 'S&P Shariah',
    description: 'S&P Dow Jones Islamic Market indices',
    thresholds: {
      leverage: 0.33,
      liquidity: 0.33,
      receivables: 0.49,
      haramRevenue: 0.05,
    },
    leverageDenominator: 'marketCap',
    liquidityDenominator: 'marketCap',
    receivablesDenominator: 'marketCap',
  },
  FTSE: {
    label: 'FTSE Shariah',
    description: 'FTSE Shariah Global Equity Index',
    thresholds: {
      leverage: 0.3333,      // 33.33% of total assets (not market cap)
      liquidity: 0.3333,     // 33.33% of total assets
      receivables: 0.50,     // 50% of total assets
      haramRevenue: 0.05,
    },
    leverageDenominator: 'totalAssets',
    liquidityDenominator: 'totalAssets',
    receivablesDenominator: 'totalAssets',
  },
}

export function getMethodology(key) {
  return METHODOLOGIES[key] || METHODOLOGIES.AAOIFI
}

// ============================================================
// 1. BUSINESS ACTIVITY SCREEN
// ============================================================

/**
 * Industries that are categorically haram. Match is case-insensitive and
 * uses substring containment in either direction so "Banks—Diversified"
 * still matches "Banks".
 */
const HARAM_INDUSTRIES = [
  // Alcohol
  'breweries', 'wineries', 'distilleries', 'beverages—brewers',
  'beverages—wineries & distilleries', 'beverages - brewers',
  'beverages - wineries & distilleries',
  // Conventional banking & insurance (riba-based)
  'banks—diversified', 'banks—regional', 'banks - diversified', 'banks - regional',
  'savings & cooperative banks',
  'insurance—diversified', 'insurance—life', 'insurance—property & casualty',
  'insurance—reinsurance', 'insurance—specialty', 'insurance - diversified',
  'insurance - life', 'insurance - property & casualty', 'insurance - reinsurance',
  'insurance - specialty', 'insurance brokers',
  'mortgage finance', 'credit services', 'consumer finance', 'capital markets',
  // Gambling
  'gambling', 'casinos & gaming', 'resorts & casinos',
  // Tobacco
  'tobacco',
  // Adult entertainment
  'adult entertainment',
  // Pork & non-halal meat
  'pork production',
]

/**
 * Industries that are conditionally permissible — pass only if non-permissible
 * income < 5%. The financial ratio screen handles the actual gate.
 */
const CAUTIONARY_INDUSTRIES = [
  'lodging', 'restaurants', 'hotels',
  'entertainment', 'media—diversified', 'media - diversified', 'broadcasting',
  'department stores', 'discount stores', 'grocery stores', 'specialty retail',
  'aerospace & defense', 'travel services', 'leisure',
]

const CAUTIONARY_SECTORS = ['communication services']

function tokenIncludes(haystack, needle) {
  if (!haystack || !needle) return false
  return haystack.includes(needle) || needle.includes(haystack)
}

export function screenBusinessActivity(profile) {
  const sector = (profile.sector || '').toLowerCase().trim()
  const industry = (profile.industry || '').toLowerCase().trim()

  if (!sector && !industry) {
    return {
      pass: false,
      status: 'DOUBTFUL',
      reason: 'Missing business activity information',
      detail:
        'Cannot determine Shariah compliance because the sector and industry are not provided in the data source. This often occurs for ETFs, mutual funds, or newly listed entities.',
    }
  }

  if (HARAM_INDUSTRIES.some(h => tokenIncludes(industry, h))) {
    return {
      pass: false,
      status: 'FAIL',
      reason: `Primary business is non-permissible: ${profile.industry}`,
      detail: `The "${profile.industry}" industry involves activities prohibited under Shariah law.`,
    }
  }

  if (
    CAUTIONARY_INDUSTRIES.some(c => tokenIncludes(industry, c)) ||
    CAUTIONARY_SECTORS.some(c => tokenIncludes(sector, c))
  ) {
    return {
      pass: true,
      status: 'CAUTION',
      reason: 'Mixed business — requires <5% haram revenue check',
      detail: `The "${profile.industry || profile.sector}" industry may include non-permissible revenue streams. The haram income ratio test will determine final compliance.`,
    }
  }

  return {
    pass: true,
    status: 'PASS',
    reason: `Permissible business activity: ${profile.industry || profile.sector}`,
    detail: `The "${profile.industry || profile.sector}" industry does not involve prohibited activities.`,
  }
}

// ============================================================
// 2. FINANCIAL RATIO SCREEN
// ============================================================

function calculateRatio(name, numerator, denominator, threshold, description) {
  if (!denominator || denominator <= 0) {
    return {
      name,
      pass: false,
      ratio: null,
      threshold,
      thresholdPercent: (threshold * 100).toFixed(2) + '%',
      ratioPercent: 'N/A',
      numerator,
      denominator,
      description,
      error: 'Denominator unavailable',
    }
  }

  const ratio = numerator / denominator
  return {
    name,
    pass: ratio < threshold,
    ratio,
    threshold,
    thresholdPercent: (threshold * 100).toFixed(2) + '%',
    ratioPercent: (ratio * 100).toFixed(2) + '%',
    numerator,
    denominator,
    description,
    error: null,
  }
}

export function screenFinancialRatios({
  totalDebt,
  marketCap,
  totalAssets,
  cashAndInterestBearing,
  receivables,
  haramRevenue = 0,
  totalRevenue,
  haramDescription = 'Non-permissible Revenue ÷ Total Revenue must be < 5%',
  methodology = 'AAOIFI',
}) {
  const cfg = getMethodology(methodology)

  const denominators = {
    marketCap,
    totalAssets,
  }

  const leverageDenom = denominators[cfg.leverageDenominator] ?? marketCap
  const liquidityDenom = denominators[cfg.liquidityDenominator] ?? marketCap
  const receivablesDenom = denominators[cfg.receivablesDenominator] ?? marketCap

  const denomLabel = (key) =>
    key === 'totalAssets' ? 'Total Assets' : 'Market Cap'

  const ratios = [
    calculateRatio(
      'Leverage Ratio',
      totalDebt,
      leverageDenom,
      cfg.thresholds.leverage,
      `Total Debt ÷ ${denomLabel(cfg.leverageDenominator)} must be < ${(cfg.thresholds.leverage * 100).toFixed(2)}%`
    ),
    calculateRatio(
      'Liquidity Ratio',
      cashAndInterestBearing,
      liquidityDenom,
      cfg.thresholds.liquidity,
      `(Cash + Interest-bearing Securities) ÷ ${denomLabel(cfg.liquidityDenominator)} must be < ${(cfg.thresholds.liquidity * 100).toFixed(2)}%`
    ),
    calculateRatio(
      'Receivables Ratio',
      receivables,
      receivablesDenom,
      cfg.thresholds.receivables,
      `Accounts Receivable ÷ ${denomLabel(cfg.receivablesDenominator)} must be < ${(cfg.thresholds.receivables * 100).toFixed(2)}%`
    ),
    calculateRatio(
      'Haram Income Ratio',
      haramRevenue,
      totalRevenue,
      cfg.thresholds.haramRevenue,
      haramDescription
    ),
  ]

  return { ratios, allPass: ratios.every(r => r.pass), methodology: cfg.label }
}

// ============================================================
// 3. PURIFICATION
// ============================================================

const CURRENCY_SYMBOLS = {
  USD: '$', GBP: '£', EUR: '€', ZAR: 'R',
  JPY: '¥', CAD: '$', AUD: '$', INR: '₹',
  CHF: 'Fr', CNY: '¥', SGD: 'S$', HKD: 'HK$',
  AED: 'د.إ', SAR: 'ر.س', PKR: '₨',
}

export function getCurrencySymbol(currency = 'USD') {
  return CURRENCY_SYMBOLS[currency] || `${currency} `
}

export function calculatePurification(haramRevenuePercent, dividendReceived, currency = 'USD') {
  const amount = (haramRevenuePercent || 0) * (dividendReceived || 0)
  const symbol = getCurrencySymbol(currency)

  return {
    amount: Math.round(amount * 100) / 100,
    percent: haramRevenuePercent,
    percentDisplay: ((haramRevenuePercent || 0) * 100).toFixed(2) + '%',
    description:
      amount > 0
        ? `Donate ${symbol}${amount.toFixed(2)} to charity from this dividend`
        : 'No purification required — no haram income detected',
  }
}

// ============================================================
// 4. OVERALL VERDICT
// ============================================================

export function screenStock(profile, balanceSheet, income, options = {}) {
  const methodology = options.methodology && METHODOLOGIES[options.methodology]
    ? options.methodology
    : 'AAOIFI'

  const businessScreen = screenBusinessActivity(profile)

  // Both interest INCOME (riba earned) and interest EXPENSE (riba paid)
  // are considered non-permissible under AAOIFI standards.
  const interestIncome = Math.abs(income.interestIncome || 0)
  const interestExpense = Math.abs(income.interestExpense || 0)
  const estimatedHaramRevenue = interestIncome + interestExpense

  const dataSource = income.interestDataSource || 'unknown'
  let haramDescription = 'Non-permissible Revenue ÷ Total Revenue must be < 5%'
  if (dataSource === 'explicit') {
    haramDescription = 'Interest Income + Interest Expense ÷ Total Revenue must be < 5% (from reported financial data)'
  } else if (dataSource === 'estimated') {
    haramDescription = 'Non-operating Income ÷ Total Revenue must be < 5% (estimated — explicit interest data unavailable)'
  } else if (dataSource === 'debt-derived') {
    haramDescription = 'Estimated Interest (Total Debt × 5%) ÷ Total Revenue must be < 5% (derived from debt — no interest data available)'
  }

  const financialScreen = screenFinancialRatios({
    totalDebt: balanceSheet.totalDebt,
    marketCap: profile.marketCap,
    totalAssets: balanceSheet.totalAssets,
    cashAndInterestBearing: balanceSheet.cashAndShortTermInvestments,
    receivables: balanceSheet.netReceivables,
    haramRevenue: estimatedHaramRevenue,
    totalRevenue: income.revenue,
    haramDescription,
    methodology,
  })

  // Status taxonomy (post-migration 007):
  //   COMPLIANT       — passes both screens with available data
  //   NON_COMPLIANT   — real threshold violation OR haram business activity
  //   REVIEW_REQUIRED — mixed-business CAUTION; passes financial screens but
  //                     the revenue mix needs human judgement
  //   UNVERIFIED      — data gaps prevent a confident verdict; the Verify
  //                     flow can re-fetch against SEC EDGAR to resolve
  //
  // The old conflated DOUBTFUL bucket is split into REVIEW_REQUIRED vs
  // UNVERIFIED so the UI can show users which need human attention and
  // which are auto-resolvable. confidence is a separate axis: it stays
  // MEDIUM for single-source (Yahoo only) verdicts and gets bumped to
  // HIGH in Phase 3 when EDGAR cross-verifies the key fields.
  let status = 'COMPLIANT'
  let statusReason = 'All screening criteria passed'
  let confidence = 'MEDIUM'

  if (businessScreen.status === 'DOUBTFUL') {
    // Missing sector/industry — can't classify the business at all.
    status = 'UNVERIFIED'
    statusReason = businessScreen.reason
    confidence = 'LOW'
  } else if (!businessScreen.pass) {
    status = 'NON_COMPLIANT'
    statusReason = businessScreen.reason
  } else if (!financialScreen.allPass) {
    const failedRatios = financialScreen.ratios.filter(r => !r.pass)
    const realFailures = failedRatios.filter(r => !r.error)
    const dataGaps = failedRatios.filter(r => r.error)

    if (realFailures.length > 0) {
      status = 'NON_COMPLIANT'
      statusReason = `Failed ${realFailures.length} financial ratio(s): ${realFailures.map(r => r.name).join(', ')}`
    } else if (dataGaps.length >= 2) {
      // Two or more ratios have missing data — too unreliable to call.
      // Verify flow (Phase 3) can resolve via SEC EDGAR for US tickers.
      status = 'UNVERIFIED'
      confidence = 'LOW'
      statusReason = `Cannot verify ${dataGaps.length} of ${financialScreen.ratios.length} ratios due to missing financial data — tap Verify to re-fetch.`
    } else {
      // Single data gap, rest pass. Preserve the lenient COMPLIANT verdict
      // introduced by commit 12a7528 (prevents false Needs-Review noise),
      // but lower confidence so the UI can prompt verification for users
      // who want certainty.
      status = 'COMPLIANT'
      confidence = 'LOW'
      statusReason = `Passes available ratios. The ${dataGaps[0].name} couldn't be computed from current data — tap Verify to confirm.`
    }
  } else if (businessScreen.status === 'CAUTION') {
    // Mixed business activity (hotels, media, etc.) — passes the quantitative
    // screens but requires human judgement of revenue mix. This is the
    // *only* path to REVIEW_REQUIRED, so users see a small number of items
    // that genuinely need their attention rather than a noisy bucket.
    status = 'REVIEW_REQUIRED'
    statusReason = 'Business activity is mixed — passes financial screens but the revenue mix requires human review.'
  }

  const haramIncomeRatio = financialScreen.ratios.find(r => r.name === 'Haram Income Ratio')
  const haramPercent = haramIncomeRatio?.ratio || 0

  return {
    ticker: profile.ticker,
    companyName: profile.name,
    sector: profile.sector,
    industry: profile.industry,
    exchange: profile.exchange,
    marketCap: profile.marketCap,
    currency: profile.currency,

    methodology: financialScreen.methodology,
    methodologyKey: methodology,

    status,
    statusReason,
    confidence,

    businessScreen,
    financialScreen,

    haramRevenuePercent: haramPercent,
    purificationNote:
      haramPercent > 0
        ? `${(haramPercent * 100).toFixed(2)}% of dividends should be donated to charity`
        : null,

    dataSources: {
      balanceSheetPeriod: balanceSheet.period,
      incomeStatementPeriod: income.period,
      interestDataSource: dataSource,
    },

    disclaimer:
      'This tool provides a screening framework based on AAOIFI and major scholarly standards. It is not a fatwa. For certainty on specific investments, consult a qualified Islamic finance scholar.',
  }
}
