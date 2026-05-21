#!/usr/bin/env node
/**
 * Validates each candidate Islamic-bank ticker against the live Halaq API.
 * For each ticker, fetches /api/screen and prints whether it resolves +
 * the company name + industry that Yahoo returns, so we can spot ticker
 * format mismatches (e.g. .DU vs .AE on UAE listings) before adding the
 * entries to SHARIAH_CERTIFIED_INSTITUTIONS.
 *
 * Each candidate is given a list of ticker-symbol variants to try; the
 * first that resolves wins. Outputs a JSON snippet ready to paste into
 * complianceEngine.js.
 */

const API_BASE = 'https://halaq.vercel.app';

const CANDIDATES = [
  // Saudi Arabia — Tadawul uses 4-digit codes with .SR suffix on Yahoo
  { expected: 'Al Rajhi Bank',           variants: ['1180.SR'] },
  { expected: 'Bank Albilad',            variants: ['1140.SR'] },
  { expected: 'Bank Alinma',             variants: ['1150.SR'] },
  { expected: 'Bank Aljazira',           variants: ['1020.SR'] },
  { expected: 'Bank Aljazira (alt)',     variants: ['1120.SR'] }, // sometimes confused
  // UAE — Dubai Financial Market typically .DU; Abu Dhabi Securities Exchange .AE or .AD
  { expected: 'Dubai Islamic Bank',      variants: ['DIB.DU', 'DIB.AE'] },
  { expected: 'Emirates Islamic',        variants: ['EIB.DU', 'EIB.AE'] },
  { expected: 'Abu Dhabi Islamic Bank',  variants: ['ADIB.AE', 'ADIB.AD'] },
  { expected: 'Sharjah Islamic Bank',    variants: ['SIB.AE', 'SIB.AD'] },
  // Qatar — Qatar Stock Exchange uses .QA
  { expected: 'Qatar Islamic Bank',      variants: ['QIBK.QA'] },
  { expected: 'Masraf Al Rayan',         variants: ['MARK.QA'] },
  // Kuwait — Boursa Kuwait uses .KW
  { expected: 'Kuwait Finance House',    variants: ['KFH.KW'] },
  { expected: 'Boubyan Bank',            variants: ['BOUBYAN.KW', 'BOUB.KW'] },
  // Bahrain — uses .BH
  { expected: 'Al Baraka Banking Group', variants: ['BARKA.BH', 'BARKA.AE'] },
  // Malaysia — Bursa Malaysia uses .KL
  { expected: 'Bank Islam Malaysia',     variants: ['BIMB.KL', '5258.KL'] },
  // Indonesia — IDX uses .JK
  { expected: 'Bank Syariah Indonesia',  variants: ['BRIS.JK'] },
  // Pakistan — Karachi Stock Exchange uses .KA
  { expected: 'Meezan Bank',             variants: ['MEBL.KA'] },
];

async function probeOne(ticker) {
  try {
    const r = await fetch(`${API_BASE}/api/screen/${encodeURIComponent(ticker)}`, {
      headers: { 'user-agent': 'Halaq-islamic-bank-validator/1.0' },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return { ok: false, status: r.status, error: body.slice(0, 100) };
    }
    const p = await r.json();
    return {
      ok: true,
      name: p.profile?.name || '—',
      industry: p.profile?.industry || '—',
      sector: p.profile?.sector || '—',
      exchange: p.profile?.exchange || '—',
      country: p.profile?.country || '—',
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'fetch failed' };
  }
}

(async () => {
  const verified = [];
  const failed = [];

  for (const candidate of CANDIDATES) {
    process.stdout.write(`\n→ ${candidate.expected.padEnd(34)}`);
    let resolved = null;
    for (const variant of candidate.variants) {
      const r = await probeOne(variant);
      if (r.ok) {
        resolved = { ticker: variant, ...r };
        process.stdout.write(` ✓ ${variant.padEnd(14)} → ${r.name} (${r.industry})`);
        break;
      } else {
        process.stdout.write(` ✗ ${variant} (${r.status || 'err'})`);
      }
    }
    if (resolved) {
      verified.push({ expected: candidate.expected, ...resolved });
    } else {
      failed.push({ expected: candidate.expected, variants: candidate.variants });
    }
  }

  console.log('\n\n══════════════════════════════════════════════════════════════════');
  console.log('VERIFIED — paste into SHARIAH_CERTIFIED_INSTITUTIONS:');
  console.log('══════════════════════════════════════════════════════════════════');
  verified.forEach(v => {
    console.log(`  '${v.ticker}',`.padEnd(20) + ` // ${v.name}`);
  });

  if (failed.length) {
    console.log('\n══════════════════════════════════════════════════════════════════');
    console.log('FAILED — manual lookup needed:');
    console.log('══════════════════════════════════════════════════════════════════');
    failed.forEach(f => console.log(`  ${f.expected.padEnd(34)} tried: ${f.variants.join(', ')}`));
  }
})();
