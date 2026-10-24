#!/usr/bin/env node
/**
 * Record raw Yahoo responses as test fixtures, so the normaliser and engine
 * can be tested offline against real payload shapes. Run:
 *
 *   node scripts/capture-yahoo-fixtures.js AAPL MSFT SBK.JO
 *
 * Writes test/fixtures/yahoo/<TICKER>.json. Payloads are trimmed to what
 * normalizeScreeningPayload reads (latest two annual rows, latest TTM row,
 * no officer lists) to keep the fixtures small and reviewable.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fetchRawYahoo } from '../api/_lib/yahoo.js';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures', 'yahoo');

const byDateDesc = rows =>
  [...(rows || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

function trim(raw) {
  const quote = structuredClone(raw.quote || {});
  if (quote.assetProfile) {
    delete quote.assetProfile.companyOfficers;
    const summary = quote.assetProfile.longBusinessSummary;
    if (summary) quote.assetProfile.longBusinessSummary = summary.slice(0, 280);
  }
  return {
    quote,
    timeSeries: byDateDesc(raw.timeSeries).slice(0, 2),
    ttmFinancials: Array.isArray(raw.ttmFinancials) ? byDateDesc(raw.ttmFinancials).slice(0, 1) : raw.ttmFinancials,
    liveQuote: raw.liveQuote,
  };
}

const tickers = process.argv.slice(2).map(t => t.toUpperCase());
if (tickers.length === 0) {
  console.error('Usage: node scripts/capture-yahoo-fixtures.js TICKER [TICKER...]');
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });
for (const ticker of tickers) {
  try {
    const raw = await fetchRawYahoo(ticker);
    const fixture = { ticker, capturedAt: new Date().toISOString(), ...trim(raw) };
    await writeFile(join(OUT_DIR, `${ticker}.json`), JSON.stringify(fixture, null, 2) + '\n');
    console.log(`✓ ${ticker}`);
  } catch (err) {
    console.error(`✗ ${ticker}: ${err.message}`);
  }
}
