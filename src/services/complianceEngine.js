/**
 * Halaq Shariah compliance engine.
 *
 * Implements the qualitative business-activity screen and the quantitative
 * financial-ratio screen on top of normalised profile + balance-sheet + income
 * data, plus a purification calculator. Pure functions, easy to unit-test.
 *
 * Methodologies supported — sources and the date each was last checked are
 * in SHARIAH.md; thresholds are pinned by test/complianceEngine.test.js:
 *   - AAOIFI (default) — Shari'ah Standard No. 21
 *   - DJIM   — Dow Jones Islamic Market Indices methodology (Sept 2026)
 *   - SP     — S&P Shariah Indices methodology (Oct 2026)
 *   - FTSE   — FTSE Yasaar Global Equity Shariah Index Series
 *
 * Disclaimer: this is screening guidance, not a fatwa. Consult a qualified
 * scholar for personal rulings.
 */

// ============================================================
// 0. CONSTANTS
// ============================================================

export const METHODOLOGY_KEYS = ['AAOIFI', 'DJIM', 'SP', 'FTSE']

/**
 * Screening presets.
 *
 * `denominator` applies to the leverage, liquidity and receivables ratios.
 * `marketCapAverageMonths` is the averaging window the index specifies; the
 * fast screen uses current market cap and the Verify path a 24-month
 * average, so the UI states which one a verdict used. A null receivables
 * threshold means the standard has no receivables screen (S&P and DJIM
 * dropped theirs; AAOIFI SS21 never had one). `revenueIncludesInterest`
 * divides by total business revenue — operating revenue plus all interest
 * income — as S&P and DJIM specify.
 */
const METHODOLOGIES = {
  AAOIFI: {
    label: 'AAOIFI',
    description: "AAOIFI Shari'ah Standard No. 21 (Financial Papers)",
    thresholds: {
      leverage: 0.30,        // interest-bearing debt / market cap
      liquidity: 0.30,       // (cash + interest-bearing securities) / market cap
      receivables: null,
      haramRevenue: 0.05,    // impermissible income / total revenue
    },
    denominator: 'marketCap',
    marketCapAverageMonths: null,
    receivablesIncludeCash: false,
    revenueIncludesInterest: false,
  },
  DJIM: {
    label: 'Dow Jones Islamic Market',
    description: 'Dow Jones Islamic Market Indices methodology (September 2026)',
    thresholds: {
      leverage: 0.30,
      liquidity: 0.30,
      receivables: null,
      haramRevenue: 0.05,
    },
    denominator: 'marketCap',
    marketCapAverageMonths: 24,
    receivablesIncludeCash: false,
    revenueIncludesInterest: true,
  },
  SP: {
    label: 'S&P Shariah',
    description: 'S&P Shariah Indices methodology (October 2026)',
    thresholds: {
      leverage: 0.30,
      liquidity: 0.30,
      receivables: null,
      haramRevenue: 0.05,
    },
    denominator: 'marketCap',
    marketCapAverageMonths: 36,
    receivablesIncludeCash: false,
    revenueIncludesInterest: true,
  },
  FTSE: {
    label: 'FTSE Shariah',
    description: 'FTSE Yasaar Global Equity Shariah Index Series',
    thresholds: {
      leverage: 0.33333,     // 33.333% of total assets (not market cap)
      liquidity: 0.33333,
      receivables: 0.50,     // (receivables + cash) / total assets
      haramRevenue: 0.05,
    },
    denominator: 'totalAssets',
    marketCapAverageMonths: null,
    receivablesIncludeCash: true,
    revenueIncludesInterest: false,
  },
}

export function getMethodology(key) {
  return METHODOLOGIES[key] || METHODOLOGIES.AAOIFI
}

// ============================================================
// 1. BUSINESS ACTIVITY SCREEN
// ============================================================

/**
 * Industries that are categorically haram.
 *
 * Matching: industry strings from Yahoo are normalised (em-dash / hyphen /
 * underscore / slash / ampersand collapsed to whitespace, multiple spaces
 * coalesced) before a whole-word check. This intentionally tightens the
 * old bidirectional substring match — previously "Entertainment" matched
 * "Adult Entertainment" via `'adult entertainment'.includes('entertainment')`,
 * mislabelling Disney as categorically haram. The whole-word match here
 * still catches every separator variant the source data ships (em-dash,
 * hyphen, ampersand) without that false-positive class.
 */
const HARAM_INDUSTRIES = [
  // Alcohol
  'breweries', 'wineries', 'distilleries',
  'beverages brewers', 'beverages wineries and distilleries',
  // Conventional banking & insurance (riba-based)
  'banks diversified', 'banks regional',
  'savings and cooperative banks',
  'insurance diversified', 'insurance life', 'insurance property and casualty',
  'insurance reinsurance', 'insurance specialty', 'insurance brokers',
  'mortgage finance', 'credit services', 'consumer finance', 'capital markets',
  // Gambling
  'gambling', 'casinos and gaming', 'resorts and casinos',
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
 *
 * Internet content & interactive home entertainment land here because their
 * advertising / monetisation revenue mix typically includes some non-permissible
 * sources (alcohol/gambling/adult advertisers; loot-box mechanics). Luxury
 * goods are flagged because conglomerates like LVMH derive ~8% of revenue
 * from wines & spirits divisions (Moët, Hennessy) — the financial-screen
 * 5% haram-revenue threshold catches the worst offenders, but the CAUTION
 * status prompts the user to verify the revenue mix.
 */
const CAUTIONARY_INDUSTRIES = [
  'lodging', 'restaurants', 'hotels',
  'entertainment', 'media diversified', 'broadcasting',
  'department stores', 'discount stores', 'grocery stores', 'specialty retail',
  'aerospace and defense', 'travel services', 'leisure',
  // Added: ad-driven internet platforms (replaces the old "communication services"
  // sector blanket which over-flagged pure telecoms like 7010.SR Saudi Telecom).
  'internet content and information',
  'interactive home entertainment',
  'electronic gaming and multimedia',
  // Added: luxury goods conglomerates routinely carry alcohol revenue.
  'luxury goods',
]

// Previously contained 'communication services' as a blanket caution; that
// caught pure telecoms (no ad revenue, no caution warranted). Replaced with
// the specific industries above. Kept as an empty array so callers don't
// need to be updated, and so it's a place to add narrow sector flags later
// if needed.
const CAUTIONARY_SECTORS = []

/**
 * Shariah-certified financial institutions whose compliance is asserted via
 * their own Shariah Supervisory Boards. These tickers bypass the standard
 * business-activity haram check (they'd otherwise fail on "Banks - Regional"
 * etc.) and the verdict is overridden to COMPLIANT in `screenStock` — the
 * conventional AAOIFI leverage/liquidity ratios don't apply directly to
 * Islamic banks (deposits are Mudarabah/Wakala contracts, not interest-
 * bearing debt) so showing them as failing those ratios would mislead
 * users. Same approach used by Zoya, Musaffa, S&P Shariah and FTSE Shariah.
 *
 * Tickers verified against Yahoo on 2026-05-21 via scripts/validate-islamic-banks.js;
 * a few candidate entries (ADIB, SIB) were excluded because Yahoo doesn't
 * carry them. Refresh the list when new institutions list or existing ones
 * change Shariah status.
 */
const SHARIAH_CERTIFIED_INSTITUTIONS = new Set([
  // Saudi Arabia — Tadawul
  '1120.SR',  // Al Rajhi Banking and Investment Corporation
  '1140.SR',  // Bank Albilad
  '1150.SR',  // Alinma Bank
  '1020.SR',  // Bank AlJazira
  // UAE — DFM / ADX (Yahoo aggregates UAE under .AE)
  'DIB.AE',   // Dubai Islamic Bank
  'EIB.AE',   // Emirates Islamic Bank
  // Qatar — QSE
  'QIBK.QA',  // Qatar Islamic Bank
  'MARK.QA',  // Masraf Al Rayan
  // Kuwait — Boursa Kuwait
  'KFH.KW',   // Kuwait Finance House
  'BOUBYAN.KW', // Boubyan Bank
  // Bahrain — BHB
  'BARKA.BH', // Al Baraka Banking Group
  // Malaysia — Bursa
  '5258.KL',  // Bank Islam Malaysia Berhad
  // Indonesia — IDX
  'BRIS.JK',  // Bank Syariah Indonesia
  // Pakistan — KSE
  'MEBL.KA',  // Meezan Bank
])

export function isShariahCertifiedInstitution(ticker) {
  return SHARIAH_CERTIFIED_INSTITUTIONS.has((ticker || '').toUpperCase())
}

/**
 * Normalise industry/sector strings for keyword matching. Collapses every
 * separator Yahoo (or any data source) is likely to ship — em-dash, en-dash,
 * hyphen, underscore, slash, ampersand — into single-space-separated tokens
 * so a single keyword list catches all variants.
 */
function normalizeIndustryString(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[—–\-_/]/g, ' ')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Whole-word/phrase match: returns true iff `keyword` appears in `industry`
 * as a complete word or contiguous phrase, after both are normalised. Fixes
 * the old bidirectional `tokenIncludes` bug where "entertainment" matched
 * "adult entertainment" via reverse substring containment.
 */
function industryMatch(industry, keyword) {
  const n = normalizeIndustryString(industry)
  const k = normalizeIndustryString(keyword)
  if (!n || !k) return false
  if (n === k) return true
  const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`).test(n)
}

export function screenBusinessActivity(profile) {
  const sector = profile.sector || ''
  const industry = profile.industry || ''

  if (!sector.trim() && !industry.trim()) {
    return {
      pass: false,
      status: 'DOUBTFUL',
      reason: 'Missing business activity information',
      detail:
        'Cannot determine Shariah compliance because the sector and industry are not provided in the data source. This often occurs for ETFs, mutual funds, or newly listed entities.',
    }
  }

  if (HARAM_INDUSTRIES.some(h => industryMatch(industry, h))) {
    return {
      pass: false,
      status: 'FAIL',
      reason: `Primary business is non-permissible: ${profile.industry}`,
      detail: `The "${profile.industry}" industry involves activities prohibited under Shariah law.`,
    }
  }

  if (
    CAUTIONARY_INDUSTRIES.some(c => industryMatch(industry, c)) ||
    CAUTIONARY_SECTORS.some(c => industryMatch(sector, c))
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

const RATIO_NAMES = {
  leverage: 'Leverage Ratio',
  liquidity: 'Liquidity Ratio',
  receivables: 'Receivables Ratio',
  haramIncome: 'Haram Income Ratio',
}

const formatPercent = value => (value * 100).toFixed(2) + '%'

/**
 * One ratio test. A missing denominator or numerator is a data gap
 * (`error` set) — never a 0% pass. `estimated` marks a ratio computed from a
 * proxy figure; the verdict won't hard-fail a stock on an estimate alone.
 */
function calculateRatio(key, numerator, denominator, threshold, description, { estimated = false, denominatorError = null } = {}) {
  const base = {
    key,
    name: RATIO_NAMES[key],
    threshold,
    thresholdPercent: formatPercent(threshold),
    numerator,
    denominator,
    description,
    estimated,
  }

  if (!denominator || denominator <= 0) {
    return { ...base, pass: false, ratio: null, ratioPercent: 'N/A', error: denominatorError || 'Denominator unavailable' }
  }
  if (numerator == null || !Number.isFinite(numerator)) {
    return { ...base, pass: false, ratio: null, ratioPercent: 'N/A', error: 'Data unavailable' }
  }

  const ratio = numerator / denominator
  return { ...base, pass: ratio < threshold, ratio, ratioPercent: formatPercent(ratio), error: null }
}

export function screenFinancialRatios({
  totalDebt,
  marketCap,
  marketCapError = null,
  totalAssets,
  cashAndInterestBearing,
  receivables,
  haramRevenue = null,
  haramRevenueEstimated = false,
  totalRevenue,
  haramDescription,
  methodology = 'AAOIFI',
}) {
  const cfg = getMethodology(methodology)
  const t = cfg.thresholds
  const byAssets = cfg.denominator === 'totalAssets'
  const denominator = byAssets ? totalAssets : marketCap
  const denomLabel = byAssets ? 'Total Assets' : 'Market Cap'
  const denominatorError = byAssets ? null : marketCapError

  const ratios = [
    calculateRatio(
      'leverage',
      totalDebt,
      denominator,
      t.leverage,
      `Total Debt ÷ ${denomLabel} must be < ${formatPercent(t.leverage)}`,
      { denominatorError }
    ),
    calculateRatio(
      'liquidity',
      cashAndInterestBearing,
      denominator,
      t.liquidity,
      `(Cash + Interest-bearing Securities) ÷ ${denomLabel} must be < ${formatPercent(t.liquidity)}`,
      { denominatorError }
    ),
  ]

  if (t.receivables != null) {
    const includeCash = cfg.receivablesIncludeCash
    const numerator = !includeCash
      ? receivables
      : receivables == null || cashAndInterestBearing == null
        ? null
        : receivables + cashAndInterestBearing
    ratios.push(
      calculateRatio(
        'receivables',
        numerator,
        denominator,
        t.receivables,
        `${includeCash ? '(Accounts Receivable + Cash)' : 'Accounts Receivable'} ÷ ${denomLabel} must be < ${formatPercent(t.receivables)}`,
        { denominatorError }
      )
    )
  }

  const revenueDenominator =
    cfg.revenueIncludesInterest && totalRevenue > 0 && haramRevenue > 0
      ? totalRevenue + haramRevenue
      : totalRevenue
  ratios.push(
    calculateRatio(
      'haramIncome',
      haramRevenue,
      revenueDenominator,
      t.haramRevenue,
      haramDescription || `Impermissible Income ÷ Total Revenue must be < ${formatPercent(t.haramRevenue)}`,
      { estimated: haramRevenueEstimated }
    )
  )

  return {
    ratios,
    allPass: ratios.every(r => r.pass),
    methodology: cfg.label,
    denominator: cfg.denominator,
    marketCapAverageMonths: cfg.marketCapAverageMonths,
  }
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

  let description
  if (haramRevenuePercent == null) {
    description = "Purification can't be calculated — interest income data is unavailable"
  } else if (amount > 0) {
    description = `Donate ${symbol}${amount.toFixed(2)} to charity from this dividend`
  } else if (haramRevenuePercent > 0) {
    description = 'Enter the dividend received to calculate purification'
  } else {
    description = 'No purification required — no impermissible income detected'
  }

  return {
    amount: Math.round(amount * 100) / 100,
    percent: haramRevenuePercent,
    percentDisplay: ((haramRevenuePercent || 0) * 100).toFixed(2) + '%',
    description,
  }
}

/**
 * Purification owed on a holding: shares × annual dividend per share ×
 * impermissible-income share. Same as the S&P / DJIM dividend purification
 * ratio (dividends × non-permissible income ÷ total income).
 */
export function calculateHoldingPurification({ shares, dividendPerShare, haramRevenuePercent, currency = 'USD' }) {
  const dividends = Math.max(0, Number(shares) || 0) * Math.max(0, Number(dividendPerShare) || 0)
  return {
    dividends: Math.round(dividends * 100) / 100,
    ...calculatePurification(haramRevenuePercent, dividends, currency),
  }
}

// ============================================================
// 4. OVERALL VERDICT
// ============================================================

export function screenStock(profile, balanceSheet, income, options = {}) {
  const methodology = options.methodology && METHODOLOGIES[options.methodology]
    ? options.methodology
    : 'AAOIFI'

  const cfg = getMethodology(methodology)
  const businessScreen = screenBusinessActivity(profile)

  // Impermissible income = interest EARNED (AAOIFI SS21; S&P and DJIM count
  // "all forms of interest income"). Interest paid is what the leverage
  // ratio measures; adding it here over-failed stocks and overstated
  // purification. Yahoo can't break out other impermissible revenue lines,
  // which is why mixed businesses are routed to REVIEW_REQUIRED.
  // Older payloads may carry 'debt-derived' — treated as unavailable.
  const dataSource = ['explicit', 'estimated'].includes(income.interestDataSource)
    ? income.interestDataSource
    : 'unavailable'
  const haramRevenue =
    dataSource === 'unavailable' || income.interestIncome == null
      ? null
      : Math.abs(income.interestIncome)

  // Shariah-certified institution override. We still run the screens below
  // for reference (so the ratio breakdown is visible to the user) but the
  // final verdict is forced to COMPLIANT with an explanation. See
  // SHARIAH_CERTIFIED_INSTITUTIONS for the rationale.
  const isShariahCertified = isShariahCertifiedInstitution(profile.ticker)

  const revenueLabel = cfg.revenueIncludesInterest ? '(Total Revenue + Interest Income)' : 'Total Revenue'
  const haramLimit = formatPercent(cfg.thresholds.haramRevenue)
  const haramDescription = {
    explicit: `Interest Income ÷ ${revenueLabel} must be < ${haramLimit} (reported)`,
    estimated: `Non-operating Income ÷ ${revenueLabel} must be < ${haramLimit} (estimate — interest income isn't reported separately)`,
    unavailable: `Interest Income ÷ ${revenueLabel} must be < ${haramLimit} (interest income not available)`,
  }[dataSource]

  // Debt and cash are in the reporting currency, so they're measured against
  // market cap converted into it (api/_lib/yahoo.js). null there means the
  // exchange rate was unavailable. Profiles without the field (hand-built
  // ones, or payloads from before the conversion) are taken as one currency.
  const fx = profile.fx || null
  const ratioMarketCap = profile.marketCapInReportingCurrency !== undefined
    ? profile.marketCapInReportingCurrency
    : profile.marketCap
  const fxUnavailable = fx?.status === 'unavailable'

  const financialScreen = screenFinancialRatios({
    totalDebt: balanceSheet.totalDebt,
    marketCap: ratioMarketCap,
    marketCapError: fxUnavailable ? `No ${fx.from}→${fx.to} exchange rate to convert market cap` : null,
    totalAssets: balanceSheet.totalAssets,
    cashAndInterestBearing: balanceSheet.cashAndShortTermInvestments,
    receivables: balanceSheet.netReceivables,
    haramRevenue,
    haramRevenueEstimated: dataSource === 'estimated',
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
    const realFailures = failedRatios.filter(r => !r.error && !r.estimated)
    const estimatedFailures = failedRatios.filter(r => !r.error && r.estimated)
    const dataGaps = failedRatios.filter(r => r.error)

    if (realFailures.length > 0) {
      status = 'NON_COMPLIANT'
      statusReason = `Failed ${realFailures.length} financial ratio(s): ${realFailures.map(r => r.name).join(', ')}`
    } else if (estimatedFailures.length > 0) {
      // Only a proxy figure fails (non-operating income standing in for
      // interest income) — not enough for a hard NON_COMPLIANT.
      const r = estimatedFailures[0]
      status = 'UNVERIFIED'
      confidence = 'LOW'
      statusReason = `The ${r.name} is estimated at ${r.ratioPercent} from non-operating income, above the ${r.thresholdPercent} limit — tap Verify to check reported interest income.`
    } else if (dataGaps.length >= 2) {
      // Two or more ratios have missing data — too unreliable to call.
      // Verify flow (Phase 3) can resolve via SEC EDGAR for US tickers.
      status = 'UNVERIFIED'
      confidence = 'LOW'
      statusReason = fxUnavailable && financialScreen.denominator === 'marketCap'
        ? `Debt and cash are reported in ${fx.to} but market cap is in ${fx.from}, and the exchange rate couldn't be fetched — tap Verify to retry.`
        : `Cannot verify ${dataGaps.length} of ${financialScreen.ratios.length} ratios due to missing financial data — tap Verify to re-fetch.`
    } else if (businessScreen.status === 'CAUTION') {
      // Mixed business with one data gap: the revenue mix still needs a
      // human, so don't let the lenient single-gap rule below skip review.
      status = 'REVIEW_REQUIRED'
      confidence = 'LOW'
      statusReason = `Business activity is mixed and the ${dataGaps[0].name} couldn't be computed from current data — the revenue mix requires human review.`
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
    // screens but requires human judgement of revenue mix. These are the
    // only paths to REVIEW_REQUIRED, so users see a small number of items
    // that genuinely need their attention rather than a noisy bucket.
    status = 'REVIEW_REQUIRED'
    statusReason = 'Business activity is mixed — passes financial screens but the revenue mix requires human review.'
  }

  // Shariah-certified institution override — runs last so the screens above
  // populate `financialScreen.ratios` for display, but the final verdict is
  // forced to COMPLIANT regardless of how the conventional ratios came out.
  if (isShariahCertified) {
    status = 'COMPLIANT'
    confidence = 'HIGH'
    statusReason =
      'Shariah-certified financial institution — compliance asserted by the institution\'s own Shariah Supervisory Board. ' +
      'Conventional AAOIFI leverage/liquidity ratios are shown below for transparency, but apply imperfectly to Islamic-finance balance sheets (deposits are Mudarabah/Wakala contracts, not interest-bearing debt).'
  }

  // null when the haram-income ratio couldn't be computed — purification is
  // then unknown, not zero. Also null for Shariah-certified institutions:
  // Yahoo labels their financing profit "interest income", but it isn't
  // riba, and any purification is set by their own Shariah board.
  const haramIncomeRatio = financialScreen.ratios.find(r => r.key === 'haramIncome')
  const haramPercent = isShariahCertified ? null : haramIncomeRatio?.ratio ?? null

  return {
    ticker: profile.ticker,
    companyName: profile.name,
    sector: profile.sector,
    industry: profile.industry,
    exchange: profile.exchange,
    marketCap: profile.marketCap,
    marketCapCurrency: profile.marketCapCurrency || profile.currency,
    currency: profile.currency,

    methodology: financialScreen.methodology,
    methodologyKey: methodology,

    status,
    statusReason,
    confidence,
    isShariahCertified,

    businessScreen,
    financialScreen,

    haramRevenuePercent: haramPercent,
    haramRevenueEstimated: dataSource === 'estimated',
    purificationNote:
      haramPercent > 0
        ? `${(haramPercent * 100).toFixed(2)}% of dividends should be donated to charity${dataSource === 'estimated' ? ' (estimate)' : ''}`
        : null,

    dataSources: {
      balanceSheetPeriod: balanceSheet.period,
      incomeStatementPeriod: income.period,
      incomeBasis: income.basis || null,
      interestDataSource: dataSource,
      // How market cap was put into the reporting currency for the ratios:
      // { status: 'same' | 'converted' | 'unavailable' | 'assumed', from, to, rate, pair?, asOf? }
      fx,
      fxRate: fx?.status === 'converted' ? fx.rate : null,
      reportingCurrency: profile.reportingCurrency || balanceSheet.currency || null,
      marketCapInReportingCurrency: ratioMarketCap ?? null,
    },

    disclaimer:
      'This tool provides a screening framework based on AAOIFI and major scholarly standards. It is not a fatwa. For certainty on specific investments, consult a qualified Islamic finance scholar.',
  }
}
