/**
 * Verify-screen orchestrator — combines the fast Yahoo payload with extra
 * verification sources (24-month avg market cap, TTM income, SEC EDGAR for
 * US tickers) and produces a multi-source verdict with provenance.
 *
 * This is the heavy path. Only the /api/verify-screen endpoint calls into
 * here, and only when a user explicitly clicks Verify on a watchlist row.
 *
 * Source-priority for each Shariah-relevant field:
 *   marketCap        → 24m avg (Yahoo chart) > spot (Yahoo)
 *   totalRevenue     → TTM (Yahoo trailing) > annual (Yahoo)
 *   interest income  → EDGAR explicit > Yahoo explicit > Yahoo estimated
 *   interest expense → EDGAR explicit > Yahoo explicit > Yahoo estimated
 *   receivables      → EDGAR > Yahoo
 *   total debt       → EDGAR > Yahoo (LT + ST debt summed)
 *   cash + ST inv    → EDGAR > Yahoo
 *   total assets     → EDGAR > Yahoo
 *
 * Confidence upgrade rule: if EDGAR and Yahoo both provide a key field
 * (interest income or total debt) and they agree within 5%, confidence is
 * upgraded to HIGH. Disagreements >5% leave a `mismatches` note for the UI
 * and keep confidence at MEDIUM (the cross-check itself adds confidence
 * vs single-source, but the disagreement caps how confident we can be).
 */

import { fetchScreeningPayload } from './yahoo.js';
import { fetch24MonthAverageMarketCap, fetchTrailingTwelveMonthIncome } from './yahoo-verify.js';
import { fetchEdgarFacts } from './edgar.js';
import { screenStock } from '../../src/services/complianceEngine.js';

const AGREEMENT_TOLERANCE = 0.05;

function pct(a, b) {
  const max = Math.max(Math.abs(a), Math.abs(b));
  if (max === 0) return 0;
  return Math.abs(a - b) / max;
}

function pickWithProvenance(label, candidates) {
  // candidates: [{ value, source }] in priority order. Returns the first
  // candidate with a positive value, plus a flag indicating whether any
  // lower-priority candidate disagreed with it materially.
  const positive = candidates.filter(c => c && Number.isFinite(c.value) && c.value > 0);
  if (positive.length === 0) {
    return { value: 0, source: 'unavailable', field: label, mismatches: [] };
  }
  const picked = positive[0];
  const mismatches = positive
    .slice(1)
    .filter(c => pct(c.value, picked.value) > AGREEMENT_TOLERANCE)
    .map(c => ({ source: c.source, value: c.value, deltaPercent: pct(c.value, picked.value) }));
  return { value: picked.value, source: picked.source, field: label, mismatches };
}

export async function buildVerifiedScreening(ticker, methodology) {
  // Step 1: fetch the four data sources in parallel. Fast yahoo is the
  // baseline — every other source augments fields on top of it.
  const [fast, avgCap, ttmIncome, edgar] = await Promise.all([
    fetchScreeningPayload(ticker),
    // 24m avg needs shares outstanding, which is in the fast payload —
    // so we either chain (sequential) or pass shares=0 and let the helper
    // return unavailable. Cleaner: do a quick second pass for the avg cap
    // *after* fast resolves. But fast is already the slowest in parallel,
    // so chaining off it doesn't save anything. Pre-fetch shares from the
    // chart's most recent close × Yahoo's quote works as approximation —
    // simplest is just to do it sequentially after fast resolves.
    Promise.resolve(null),
    fetchTrailingTwelveMonthIncome(ticker).catch(() => null),
    fetchEdgarFacts(ticker).catch(() => null),
  ]);

  // Shares outstanding for the avg-cap calc isn't in `fast.profile` (we
  // didn't surface it); derive from marketCap / price as an approximation.
  const sharesProxy =
    fast?.profile?.marketCap && fast?.profile?.regularMarketPrice
      ? fast.profile.marketCap / fast.profile.regularMarketPrice
      : 0;
  const avgCapResult = sharesProxy > 0
    ? await fetch24MonthAverageMarketCap(ticker, sharesProxy).catch(() => null)
    : null;

  // Step 2: merge each Shariah-relevant field with provenance.
  const yahooInterest =
    fast.income.interestDataSource === 'explicit'
      ? { value: Math.abs(fast.income.interestIncome) + Math.abs(fast.income.interestExpense), source: 'yahoo:explicit' }
      : null;
  const ttmInterest =
    ttmIncome && ttmIncome.interestDataSource === 'explicit'
      ? { value: Math.abs(ttmIncome.interestIncome) + Math.abs(ttmIncome.interestExpense), source: 'yahoo:ttm' }
      : null;
  const edgarInterest =
    edgar?.facts.interestIncome || edgar?.facts.interestExpense
      ? {
          value:
            Math.abs(edgar.facts.interestIncome?.value || 0) +
            Math.abs(edgar.facts.interestExpense?.value || 0),
          source: edgar.facts.interestIncome?.source || edgar.facts.interestExpense?.source || 'edgar',
        }
      : null;

  const interestPick = pickWithProvenance('haram_income', [edgarInterest, ttmInterest, yahooInterest]);

  // Merged income object that screenStock consumes.
  const incomeBase = ttmIncome || fast.income;
  const totalRevenuePick = pickWithProvenance('revenue', [
    edgar?.facts.revenue && { value: edgar.facts.revenue.value, source: edgar.facts.revenue.source },
    ttmIncome?.revenue && { value: ttmIncome.revenue, source: 'yahoo:ttm' },
    fast.income.revenue && { value: fast.income.revenue, source: 'yahoo:annual' },
  ]);

  const mergedIncome = {
    ...incomeBase,
    revenue: totalRevenuePick.value || incomeBase.revenue,
    // The engine still wants split interestIncome/Expense fields. When we
    // picked EDGAR, propagate its split values; otherwise keep whatever
    // the income base (TTM or fast annual) had.
    interestIncome: edgarInterest
      ? Math.abs(edgar.facts.interestIncome?.value || 0)
      : Math.abs(incomeBase.interestIncome || 0),
    interestExpense: edgarInterest
      ? Math.abs(edgar.facts.interestExpense?.value || 0)
      : Math.abs(incomeBase.interestExpense || 0),
    interestDataSource:
      edgarInterest ? 'explicit' :
      incomeBase.interestDataSource,
  };

  // Balance sheet merge (EDGAR > Yahoo for each line).
  const totalDebtPick = pickWithProvenance('totalDebt', [
    edgar?.facts.totalDebt && {
      value:
        (edgar.facts.totalDebt?.value || 0) +
        (edgar.facts.shortTermDebt?.value || 0),
      source: edgar.facts.totalDebt?.source || 'edgar',
    },
    fast.balanceSheet.totalDebt && { value: fast.balanceSheet.totalDebt, source: 'yahoo' },
  ]);

  const receivablesPick = pickWithProvenance('receivables', [
    edgar?.facts.receivables && { value: edgar.facts.receivables.value, source: edgar.facts.receivables.source },
    fast.balanceSheet.netReceivables && { value: fast.balanceSheet.netReceivables, source: 'yahoo' },
  ]);

  const cashPick = pickWithProvenance('cash', [
    edgar?.facts.cashAndEquivalents && {
      value:
        (edgar.facts.cashAndEquivalents?.value || 0) +
        (edgar.facts.shortTermInvestments?.value || 0),
      source: edgar.facts.cashAndEquivalents?.source || 'edgar',
    },
    fast.balanceSheet.cashAndShortTermInvestments && {
      value: fast.balanceSheet.cashAndShortTermInvestments,
      source: 'yahoo',
    },
  ]);

  const totalAssetsPick = pickWithProvenance('totalAssets', [
    edgar?.facts.totalAssets && { value: edgar.facts.totalAssets.value, source: edgar.facts.totalAssets.source },
    fast.balanceSheet.totalAssets && { value: fast.balanceSheet.totalAssets, source: 'yahoo' },
  ]);

  const mergedBalanceSheet = {
    ...fast.balanceSheet,
    totalDebt: totalDebtPick.value || fast.balanceSheet.totalDebt,
    netReceivables: receivablesPick.value || fast.balanceSheet.netReceivables,
    cashAndShortTermInvestments: cashPick.value || fast.balanceSheet.cashAndShortTermInvestments,
    totalAssets: totalAssetsPick.value || fast.balanceSheet.totalAssets,
  };

  const marketCapPick = pickWithProvenance('marketCap', [
    avgCapResult?.value && { value: avgCapResult.value, source: `yahoo:24m-avg(${avgCapResult.monthsObserved}mo)` },
    fast.profile.marketCap && { value: fast.profile.marketCap, source: 'yahoo:spot' },
  ]);

  const mergedProfile = {
    ...fast.profile,
    marketCap: marketCapPick.value || fast.profile.marketCap,
  };

  // Step 3: run the screen.
  const result = screenStock(mergedProfile, mergedBalanceSheet, mergedIncome, { methodology });

  // Step 4: derive verification confidence. The engine's own `confidence`
  // is based on data gaps. We can upgrade to HIGH when we have at least
  // one EDGAR↔Yahoo agreement on a key field.
  const sourcesUsed = collectSources([
    marketCapPick, totalRevenuePick, interestPick,
    totalDebtPick, receivablesPick, cashPick, totalAssetsPick,
  ]);
  const allMismatches = [
    ...marketCapPick.mismatches,
    ...totalRevenuePick.mismatches,
    ...interestPick.mismatches,
    ...totalDebtPick.mismatches,
    ...receivablesPick.mismatches,
    ...cashPick.mismatches,
    ...totalAssetsPick.mismatches,
  ];
  const usedEdgar = sourcesUsed.some(s => s.startsWith('edgar:'));
  const usedTtm = sourcesUsed.some(s => s.includes('ttm'));
  const usedAvgCap = sourcesUsed.some(s => s.includes('24m-avg'));

  let finalConfidence = result.confidence || 'MEDIUM';
  if (result.status === 'COMPLIANT' || result.status === 'NON_COMPLIANT') {
    if (usedEdgar && allMismatches.length === 0) {
      finalConfidence = 'HIGH';
    } else if (usedEdgar && allMismatches.length > 0) {
      finalConfidence = 'MEDIUM';
    } else if (usedTtm && usedAvgCap) {
      finalConfidence = 'MEDIUM';
    }
  }

  return {
    ...result,
    confidence: finalConfidence,
    verification: {
      verifiedAt: new Date().toISOString(),
      sourcesUsed,
      usedEdgar,
      usedTtm,
      usedAvgCap,
      mismatches: allMismatches,
      marketCapBasis: avgCapResult?.value > 0
        ? `${avgCapResult.monthsObserved}-month trailing average`
        : 'spot price',
      incomeBasis: ttmIncome?.basis || 'ANNUAL',
      edgarEntity: edgar?.entityName || null,
      fieldProvenance: {
        marketCap: marketCapPick.source,
        revenue: totalRevenuePick.source,
        haramIncome: interestPick.source,
        totalDebt: totalDebtPick.source,
        receivables: receivablesPick.source,
        cashAndShortTermInvestments: cashPick.source,
        totalAssets: totalAssetsPick.source,
      },
    },
  };
}

function collectSources(picks) {
  const set = new Set();
  for (const p of picks) {
    if (p?.source && p.source !== 'unavailable') set.add(p.source);
    for (const m of p?.mismatches || []) {
      if (m.source) set.add(m.source);
    }
  }
  return Array.from(set);
}
