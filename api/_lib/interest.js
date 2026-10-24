/**
 * Shared helpers for reading Yahoo income-statement rows.
 *
 * Used by the fast screen (yahoo.js) and the Verify path (yahoo-verify.js)
 * so both classify interest data the same way.
 */

// Missing, null or non-numeric → null. Use for Shariah-relevant fields, where
// "unknown" must stay distinguishable from a reported 0.
export function numOrNull(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function firstPositive(...vals) {
  return vals.find(v => v !== null && v > 0) ?? null;
}

/**
 * Interest figures for the impermissible-income screen.
 *
 * Only interest EARNED counts toward the 5% revenue screen and toward
 * purification (AAOIFI SS21; S&P and DJIM count "all forms of interest
 * income"). Interest PAID is what the leverage ratio already measures, so it
 * is returned for display only.
 *
 * `get(key)` returns the row's value for a Yahoo field as a number or null.
 *
 * dataSource:
 *   explicit    — interest income as reported, or derived from the reported
 *                 net non-operating interest plus non-operating interest expense
 *   estimated   — positive other non-operating income (some issuers, e.g. AAPL,
 *                 only report interest inside this line). A proxy, not a bound.
 *   unavailable — no usable figure; interestIncome is null
 */
export function extractInterest(get) {
  const interestExpense = firstPositive(
    get('interestExpense'),
    get('interestExpenseNonOperating')
  );

  const reported = firstPositive(
    get('interestIncome'),
    get('interestIncomeNonOperating')
  );
  if (reported !== null) {
    return { interestIncome: reported, interestExpense, dataSource: 'explicit' };
  }

  const net = get('netNonOperatingInterestIncomeExpense');
  const nonOperatingExpense = get('interestExpenseNonOperating');
  if (net !== null && nonOperatingExpense !== null) {
    const derived = net + Math.abs(nonOperatingExpense);
    if (derived > 0) {
      return { interestIncome: derived, interestExpense, dataSource: 'explicit' };
    }
  }

  const nonOperating = firstPositive(
    get('otherNonOperatingIncomeExpenses'),
    get('otherIncomeExpense')
  );
  if (nonOperating !== null) {
    return { interestIncome: nonOperating, interestExpense, dataSource: 'estimated' };
  }

  return { interestIncome: null, interestExpense, dataSource: 'unavailable' };
}
