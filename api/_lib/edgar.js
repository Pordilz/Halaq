/**
 * SEC EDGAR adapter — fetches authoritative balance-sheet + interest data
 * from US issuers' XBRL filings as a cross-verification source for Yahoo.
 *
 * Only called from the verify-screen path. Watchlist-only scope keeps us
 * well under EDGAR's 10 req/sec fair-use limit. Non-US tickers return null
 * from here and the orchestrator falls back to Yahoo single-source with
 * confidence='MEDIUM'.
 *
 * EDGAR requires a User-Agent identifying the requester per their fair-use
 * policy (https://www.sec.gov/os/accessing-edgar-data). The address used
 * matches Halaq's support contact (commit 1c76973).
 *
 * Concept mappings: XBRL tag names vary slightly between filers and over
 * time. For each Shariah-relevant data point we try a prioritised list of
 * tags and use the first that resolves to a recent value.
 */

const USER_AGENT = 'Halaq Shariah Screener qromatech@gmail.com';
const EDGAR_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept-Encoding': 'gzip, deflate',
};

// Static ticker→CIK map. EDGAR refreshes this file daily but the CIKs
// themselves are stable so a weekly refresh on our side is plenty.
const CIK_MAP_URL = 'https://www.sec.gov/files/company_tickers.json';
const CIK_MAP_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let cikMapCache = null;
let cikMapFetchedAt = 0;

async function loadCikMap() {
  if (cikMapCache && Date.now() - cikMapFetchedAt < CIK_MAP_TTL_MS) {
    return cikMapCache;
  }
  const res = await fetch(CIK_MAP_URL, { headers: EDGAR_HEADERS });
  if (!res.ok) {
    throw new Error(`EDGAR CIK map fetch failed: ${res.status}`);
  }
  const json = await res.json();
  // SEC ships this as { "0": { cik_str, ticker, title }, "1": {...}, ... }
  const byTicker = {};
  for (const key of Object.keys(json)) {
    const row = json[key];
    if (row?.ticker && row?.cik_str) {
      byTicker[String(row.ticker).toUpperCase()] = String(row.cik_str).padStart(10, '0');
    }
  }
  cikMapCache = byTicker;
  cikMapFetchedAt = Date.now();
  return byTicker;
}

/**
 * Look up the 10-digit zero-padded CIK for a US-listed ticker. Returns
 * null for foreign tickers, ADRs not in the EDGAR map, and any lookup
 * failures (treat all of these as "no EDGAR data available").
 */
export async function lookupCik(ticker) {
  try {
    const map = await loadCikMap();
    return map[String(ticker).toUpperCase()] || null;
  } catch {
    return null;
  }
}

// Prioritised XBRL tags per Shariah-screening concept. The first tag that
// returns a usable recent value wins. Tags are from us-gaap taxonomy.
const CONCEPT_TAGS = {
  totalAssets: ['Assets'],
  totalDebt: [
    'LongTermDebt',
    'LongTermDebtNoncurrent',
    'DebtLongtermAndShorttermCombinedAmount',
  ],
  shortTermDebt: [
    'ShortTermBorrowings',
    'DebtCurrent',
    'LongTermDebtCurrent',
    'CommercialPaper',
  ],
  cashAndEquivalents: [
    'CashAndCashEquivalentsAtCarryingValue',
    'Cash',
    'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
  ],
  shortTermInvestments: [
    'ShortTermInvestments',
    'MarketableSecuritiesCurrent',
    'AvailableForSaleSecuritiesCurrent',
  ],
  receivables: [
    'AccountsReceivableNetCurrent',
    'ReceivablesNetCurrent',
    'AccountsReceivableNet',
  ],
  revenue: [
    'Revenues',
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'RevenueFromContractWithCustomerIncludingAssessedTax',
    'SalesRevenueNet',
  ],
  interestIncome: [
    'InvestmentIncomeInterest',
    'InterestAndDividendIncomeOperating',
    'InterestIncomeOperating',
    'InterestIncomeOther',
  ],
  interestExpense: [
    'InterestExpense',
    'InterestExpenseDebt',
    'InterestExpenseBorrowings',
  ],
};

/**
 * Extract the most recent annual (10-K) value for a concept, picking the
 * largest fiscal period for the most recent fiscal year. EDGAR returns
 * multiple "fact" entries per concept (one per filing); we pick the FY
 * (full-year) entry with the latest `end` date.
 *
 * Returns { value, period, source: 'edgar:10-K' } or null if no usable
 * fact was found for any of the prioritised tags.
 */
function pickLatestAnnualFact(facts, tagPriority) {
  for (const tag of tagPriority) {
    const concept = facts?.[tag];
    if (!concept) continue;

    // Pick USD units when available; fall back to first unit listed.
    const units = concept.units || {};
    const usdUnits = units['USD'];
    const candidateUnits = usdUnits || units[Object.keys(units)[0] || ''];
    if (!Array.isArray(candidateUnits)) continue;

    // 10-K annual filings have fp='FY'. Sort by `end` date desc and take
    // the most recent. Skip facts older than 18 months (likely a stale
    // restatement, not the current filing).
    const eighteenMonthsAgoIso = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 18);
      return d.toISOString().split('T')[0];
    })();

    const annuals = candidateUnits
      .filter(f => f.fp === 'FY' && f.form && f.form.startsWith('10-K'))
      .filter(f => f.end && f.end >= eighteenMonthsAgoIso)
      .sort((a, b) => (b.end || '').localeCompare(a.end || ''));

    if (annuals.length > 0) {
      const fact = annuals[0];
      return {
        value: Number(fact.val) || 0,
        period: fact.end,
        source: `edgar:${fact.form}`,
        tag,
      };
    }
  }
  return null;
}

/**
 * Fetch the SEC companyfacts payload and extract the Shariah-relevant
 * concepts. Returns null if the ticker isn't in EDGAR (foreign, ETF, etc.)
 * or if the fetch fails — the orchestrator treats both as "no EDGAR data."
 */
export async function fetchEdgarFacts(ticker) {
  const cik = await lookupCik(ticker);
  if (!cik) return null;

  try {
    const res = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      { headers: EDGAR_HEADERS }
    );
    if (!res.ok) return null;
    const json = await res.json();

    const facts = json?.facts?.['us-gaap'];
    if (!facts) return null;

    const extracted = {};
    for (const [key, tagPriority] of Object.entries(CONCEPT_TAGS)) {
      extracted[key] = pickLatestAnnualFact(facts, tagPriority);
    }

    return {
      cik,
      entityName: json.entityName || null,
      facts: extracted,
    };
  } catch {
    return null;
  }
}
