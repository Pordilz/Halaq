#!/usr/bin/env node
/**
 * Pull 50 diverse tickers through the live Halaq screening API and emit
 * a markdown comparison table. Run as:
 *
 *   node scripts/compare-screens.js [--api-base https://halaq.vercel.app]
 *
 * The script throttles to 6 parallel requests to stay polite with Yahoo
 * (the same cap the Watchlist auto-screen loop uses). It imports the real
 * complianceEngine.js so verdicts match exactly what the deployed app
 * would produce for the same raw payload.
 */

import { screenStock } from '../src/services/complianceEngine.js';
import { fetchScreeningPayload } from '../api/_lib/yahoo.js';

const API_BASE = process.argv.includes('--api-base')
  ? process.argv[process.argv.indexOf('--api-base') + 1]
  : 'https://halaq.vercel.app';

// --local: bypass the deployed /api/screen endpoint and call
// fetchScreeningPayload directly, so we can test local engine changes
// before they're deployed. The raw Yahoo data is the same; only the
// transport layer (HTTP vs in-process) differs.
const USE_LOCAL = process.argv.includes('--local');

// 50 tickers spanning the major markets Halaq supports via Yahoo:
//   US large-caps + sector cross-section (banks, alcohol, gambling, pharma,
//   tech, retail) so we exercise every screening branch
//   UK (LSE, .L suffix), EU (XETRA .DE / Euronext .PA / Amsterdam .AS),
//   Saudi Tadawul (.SR), India NSE (.NS), Canada TSX (.TO), Australia (.AX),
//   Hong Kong (.HK), Japan (.T).
const TICKERS = [
  // ── US (20) ────────────────────────────────────────────────────────
  { t: 'AAPL',   m: 'NASDAQ', n: 'Apple Inc.' },
  { t: 'MSFT',   m: 'NASDAQ', n: 'Microsoft' },
  { t: 'GOOGL',  m: 'NASDAQ', n: 'Alphabet' },
  { t: 'AMZN',   m: 'NASDAQ', n: 'Amazon' },
  { t: 'TSLA',   m: 'NASDAQ', n: 'Tesla' },
  { t: 'NVDA',   m: 'NASDAQ', n: 'NVIDIA' },
  { t: 'META',   m: 'NASDAQ', n: 'Meta' },
  { t: 'JPM',    m: 'NYSE',   n: 'JPMorgan Chase' },
  { t: 'BAC',    m: 'NYSE',   n: 'Bank of America' },
  { t: 'WMT',    m: 'NYSE',   n: 'Walmart' },
  { t: 'KO',     m: 'NYSE',   n: 'Coca-Cola' },
  { t: 'PEP',    m: 'NASDAQ', n: 'PepsiCo' },
  { t: 'MCD',    m: 'NYSE',   n: 'McDonald\'s' },
  { t: 'NKE',    m: 'NYSE',   n: 'Nike' },
  { t: 'DIS',    m: 'NYSE',   n: 'Disney' },
  { t: 'MO',     m: 'NYSE',   n: 'Altria (tobacco)' },
  { t: 'LVS',    m: 'NYSE',   n: 'Las Vegas Sands (gambling)' },
  { t: 'PFE',    m: 'NYSE',   n: 'Pfizer' },
  { t: 'XOM',    m: 'NYSE',   n: 'ExxonMobil' },
  { t: 'BRK-B',  m: 'NYSE',   n: 'Berkshire Hathaway B' },
  // ── UK (7) ─────────────────────────────────────────────────────────
  { t: 'SHEL.L', m: 'LSE',    n: 'Shell plc' },
  { t: 'BP.L',   m: 'LSE',    n: 'BP plc' },
  { t: 'AZN.L',  m: 'LSE',    n: 'AstraZeneca' },
  { t: 'GSK.L',  m: 'LSE',    n: 'GSK' },
  { t: 'ULVR.L', m: 'LSE',    n: 'Unilever' },
  { t: 'HSBA.L', m: 'LSE',    n: 'HSBC' },
  { t: 'LLOY.L', m: 'LSE',    n: 'Lloyds Banking' },
  // ── EU (5) ─────────────────────────────────────────────────────────
  { t: 'SAP.DE', m: 'XETRA',  n: 'SAP' },
  { t: 'ASML.AS',m: 'AEX',    n: 'ASML' },
  { t: 'MC.PA',  m: 'EPA',    n: 'LVMH' },
  { t: 'OR.PA',  m: 'EPA',    n: 'L\'Oréal' },
  { t: 'SIE.DE', m: 'XETRA',  n: 'Siemens' },
  // ── Saudi (3) ─────────────────────────────────────────────────────
  { t: '2222.SR',m: 'Tadawul',n: 'Saudi Aramco' },
  { t: '1180.SR',m: 'Tadawul',n: 'Saudi National Bank (conventional)' },
  { t: '1120.SR',m: 'Tadawul',n: 'Al Rajhi Bank (Islamic — allowlisted)' },
  { t: '7010.SR',m: 'Tadawul',n: 'STC' },
  // ── India (4) ─────────────────────────────────────────────────────
  { t: 'RELIANCE.NS', m: 'NSE', n: 'Reliance Industries' },
  { t: 'TCS.NS',      m: 'NSE', n: 'Tata Consultancy' },
  { t: 'INFY.NS',     m: 'NSE', n: 'Infosys' },
  { t: 'HDFCBANK.NS', m: 'NSE', n: 'HDFC Bank' },
  // ── Canada (2) ────────────────────────────────────────────────────
  { t: 'SHOP.TO', m: 'TSX',    n: 'Shopify' },
  { t: 'RY.TO',   m: 'TSX',    n: 'Royal Bank of Canada' },
  // ── Australia (2) ─────────────────────────────────────────────────
  { t: 'BHP.AX',  m: 'ASX',    n: 'BHP Group' },
  { t: 'CBA.AX',  m: 'ASX',    n: 'Commonwealth Bank' },
  // ── Hong Kong (3) ─────────────────────────────────────────────────
  { t: '9988.HK', m: 'HKEX',   n: 'Alibaba' },
  { t: '0700.HK', m: 'HKEX',   n: 'Tencent' },
  { t: '0005.HK', m: 'HKEX',   n: 'HSBC Holdings' },
  // ── Japan (2) ─────────────────────────────────────────────────────
  { t: '7203.T',  m: 'TSE',    n: 'Toyota' },
  { t: '6758.T',  m: 'TSE',    n: 'Sony' },
  // ── Extras to hit 50 ──────────────────────────────────────────────
  { t: 'JNJ',     m: 'NYSE',   n: 'Johnson & Johnson' },
  { t: 'V',       m: 'NYSE',   n: 'Visa (payment processor)' },
];

// Length check is informational — the original snapshot was 50, but we
// added 1120.SR (Al Rajhi) to exercise the Shariah-certified institution
// allowlist after the fix.
if (TICKERS.length < 50) {
  console.error(`Ticker list has ${TICKERS.length} entries, expected at least 50.`);
  process.exit(1);
}

const CONCURRENCY = 6;

async function fetchOne({ t, m, n }) {
  try {
    let payload;
    if (USE_LOCAL) {
      // In-process: tests the local engine + local Yahoo adapter against
      // the live Yahoo Finance API. Use this to validate engine changes
      // before they're deployed to Vercel.
      payload = await fetchScreeningPayload(t);
    } else {
      const url = `${API_BASE}/api/screen/${encodeURIComponent(t)}`;
      const res = await fetch(url, { headers: { 'user-agent': 'Halaq-comparison-script/1.0' } });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { t, m, n, error: `HTTP ${res.status}: ${body.slice(0, 120)}` };
      }
      payload = await res.json();
    }
    // The local Yahoo adapter doesn't set profile.ticker (the deployed
    // endpoint adds it via the URL parameter). Patch it here so the
    // Shariah-certified-institution check in screenStock works.
    if (!payload.profile.ticker) payload.profile.ticker = t.toUpperCase();
    const verdict = screenStock(payload.profile, payload.balanceSheet, payload.income, { methodology: 'AAOIFI' });
    return { t, m, n, payload, verdict };
  } catch (err) {
    return { t, m, n, error: err?.message || 'fetch failed' };
  }
}

async function runBatched() {
  const results = new Array(TICKERS.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= TICKERS.length) return;
      const start = Date.now();
      const r = await fetchOne(TICKERS[i]);
      const ms = Date.now() - start;
      results[i] = r;
      const verdictBit = r.verdict?.status || r.error?.slice(0, 40) || '—';
      process.stderr.write(`[${(i + 1).toString().padStart(2)}/50] ${r.t.padEnd(12)} ${verdictBit.padEnd(20)} ${ms}ms\n`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

function pct(v) {
  if (!Number.isFinite(v)) return '—';
  return (v * 100).toFixed(1) + '%';
}

function ratioMap(verdict) {
  if (!verdict?.financialScreen?.ratios) return {};
  const out = {};
  for (const r of verdict.financialScreen.ratios) {
    out[r.name] = r;
  }
  return out;
}

function reasonOneLine(verdict) {
  if (!verdict) return '—';
  return verdict.statusReason.replace(/\n/g, ' ').slice(0, 110);
}

function emit(results) {
  // Per-ticker rows
  console.log('# Halaq screening — 50-stock comparison snapshot');
  console.log('');
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log(`API: ${API_BASE}`);
  console.log(`Methodology: AAOIFI (default)`);
  console.log('');
  console.log('## Verdict + headline reasoning');
  console.log('');
  console.log('| # | Ticker | Market | Name | Sector | Halaq verdict | Why |');
  console.log('|---|--------|--------|------|--------|---------------|-----|');
  results.forEach((r, i) => {
    if (r.error) {
      console.log(`| ${i + 1} | \`${r.t}\` | ${r.m} | ${r.n} | — | **ERROR** | ${r.error} |`);
      return;
    }
    const sector = r.payload?.profile?.industry || r.payload?.profile?.sector || '—';
    console.log(`| ${i + 1} | \`${r.t}\` | ${r.m} | ${r.n} | ${sector} | **${r.verdict.status}** | ${reasonOneLine(r.verdict)} |`);
  });

  // Per-ticker ratio detail
  console.log('');
  console.log('## Ratio breakdown (AAOIFI thresholds: debt < 33%, liquidity < 33%, receivables < 49%, haram revenue < 5%)');
  console.log('');
  console.log('| Ticker | Debt/MCap | Liq/MCap | Recv/MCap | Haram/Rev | Mkt cap | Data period |');
  console.log('|--------|-----------|----------|-----------|-----------|---------|-------------|');
  results.forEach(r => {
    if (r.error) {
      console.log(`| \`${r.t}\` | — | — | — | — | — | — |`);
      return;
    }
    const m = ratioMap(r.verdict);
    const mc = r.payload.profile.marketCap;
    const mcDisplay = mc >= 1e12 ? `$${(mc / 1e12).toFixed(2)}T` : mc >= 1e9 ? `$${(mc / 1e9).toFixed(1)}B` : mc >= 1e6 ? `$${(mc / 1e6).toFixed(0)}M` : '—';
    const period = r.payload.balanceSheet.period || '—';
    console.log(
      `| \`${r.t}\` | ${pct(m['Leverage Ratio']?.ratio)} | ${pct(m['Liquidity Ratio']?.ratio)} | ${pct(m['Receivables Ratio']?.ratio)} | ${pct(m['Haram Income Ratio']?.ratio)} | ${mcDisplay} | ${period} |`
    );
  });

  // Summary stats
  const stats = { COMPLIANT: 0, NON_COMPLIANT: 0, REVIEW_REQUIRED: 0, UNVERIFIED: 0, ERROR: 0 };
  results.forEach(r => {
    if (r.error) stats.ERROR++;
    else stats[r.verdict.status] = (stats[r.verdict.status] || 0) + 1;
  });
  console.log('');
  console.log('## Verdict distribution');
  console.log('');
  console.log('| Status | Count | % |');
  console.log('|--------|-------|---|');
  Object.entries(stats).forEach(([k, v]) => {
    console.log(`| ${k} | ${v} | ${(v / results.length * 100).toFixed(0)}% |`);
  });
}

(async () => {
  process.stderr.write(`Fetching ${TICKERS.length} tickers from ${API_BASE} at concurrency ${CONCURRENCY}...\n\n`);
  const t0 = Date.now();
  const results = await runBatched();
  process.stderr.write(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s.\n\n`);
  emit(results);
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
