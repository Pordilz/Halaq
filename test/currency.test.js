import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeScreeningPayload } from '../api/_lib/yahoo.js'
import { averageMarketCapFromChart } from '../api/_lib/yahoo-verify.js'
import { inReportingCurrency } from '../api/_lib/verify-screen.js'
import { screenStock } from '../src/services/complianceEngine.js'
import { majorCurrency, toReportingCurrency } from '../src/services/currency.js'

// Recorded 2026-10-25 with scripts/capture-yahoo-fixtures.js, which also
// records the FX quote. SHEL.L trades in pence and reports in US dollars,
// ULVR.L pence/euros, TSM dollars/Taiwan dollars; AAPL and NESN.SW trade
// and report in one currency.
const load = ticker =>
  JSON.parse(readFileSync(new URL(`./fixtures/yahoo/${ticker}.json`, import.meta.url), 'utf8'))

const screen = (ticker, raw = load(ticker), methodology = 'AAOIFI') => {
  const d = normalizeScreeningPayload(ticker, raw)
  const r = screenStock(d.profile, d.balanceSheet, d.income, { methodology })
  const ratio = key => r.financialScreen.ratios.find(x => x.key === key)
  return { d, r, ratio }
}

describe('currency helpers', () => {
  test('minor units map to their major currency', () => {
    assert.deepEqual(majorCurrency('GBp'), { currency: 'GBP', divisor: 100 })
    assert.deepEqual(majorCurrency('ZAc'), { currency: 'ZAR', divisor: 100 })
    assert.deepEqual(majorCurrency('ILA'), { currency: 'ILS', divisor: 100 })
    assert.deepEqual(majorCurrency('KWF'), { currency: 'KWD', divisor: 1000 })
    // Case matters: GBP is pounds, GBp is pence.
    assert.deepEqual(majorCurrency('GBP'), { currency: 'GBP', divisor: 1 })
    assert.deepEqual(majorCurrency('USD'), { currency: 'USD', divisor: 1 })
    assert.equal(majorCurrency(undefined).currency, null)
  })

  test('toReportingCurrency converts, passes through, or refuses', () => {
    assert.equal(toReportingCurrency(100, { status: 'converted', rate: 1.5 }), 150)
    assert.equal(toReportingCurrency(100, { status: 'same', rate: 1 }), 100)
    assert.equal(toReportingCurrency(100, { status: 'assumed', rate: 1 }), 100)
    assert.equal(toReportingCurrency(100, { status: 'unavailable', rate: null }), null)
    assert.equal(toReportingCurrency(100, { status: 'converted', rate: 0 }), null)
    assert.equal(toReportingCurrency(null, { status: 'same', rate: 1 }), null)
  })
})

describe('market-cap ratios use one currency', () => {
  test('SHEL.L: pence-quoted market cap is converted into US dollars', () => {
    const raw = load('SHEL.L')
    const { d, r, ratio } = screen('SHEL.L', raw)
    assert.equal(d.profile.currency, 'GBp')
    assert.equal(d.profile.marketCapCurrency, 'GBP')
    assert.equal(d.balanceSheet.currency, 'USD')
    assert.equal(d.income.currency, 'USD')
    assert.deepEqual(
      { status: d.profile.fx.status, pair: d.profile.fx.pair, rate: d.profile.fx.rate },
      { status: 'converted', pair: 'GBPUSD=X', rate: raw.fx.rate }
    )
    assert.equal(d.profile.marketCapInReportingCurrency, d.profile.marketCap * raw.fx.rate)

    // The bug: dollars of debt over pounds of market cap read 31.9%, failing
    // the 30% line. In one currency it is about 24%.
    const mixed = d.balanceSheet.totalDebt / d.profile.marketCap
    assert.ok(mixed > 0.30, `mixed-currency leverage ${mixed}`)
    assert.ok(ratio('leverage').ratio > 0.20 && ratio('leverage').ratio < 0.28, ratio('leverage').ratioPercent)
    assert.ok(ratio('liquidity').ratio < 0.15, ratio('liquidity').ratioPercent)
    assert.equal(r.status, 'COMPLIANT')
    assert.equal(screen('SHEL.L', raw, 'SP').r.status, 'COMPLIANT')
    assert.equal(screen('SHEL.L', raw, 'DJIM').r.status, 'COMPLIANT')

    // The verdict says how market cap was converted.
    assert.equal(r.dataSources.fx.pair, 'GBPUSD=X')
    assert.equal(r.dataSources.fxRate, raw.fx.rate)
    assert.equal(r.dataSources.reportingCurrency, 'USD')
    // Display still uses the trading-currency market cap.
    assert.equal(r.marketCap, raw.quote.price.marketCap)
    assert.equal(r.marketCapCurrency, 'GBP')
  })

  test('ULVR.L: pounds converted into euros', () => {
    const { d, r, ratio } = screen('ULVR.L')
    assert.equal(d.profile.fx.pair, 'GBPEUR=X')
    assert.ok(d.balanceSheet.totalDebt / d.profile.marketCap > 0.30)
    assert.ok(ratio('leverage').ratio > 0.20 && ratio('leverage').ratio < 0.28, ratio('leverage').ratioPercent)
    assert.equal(r.status, 'COMPLIANT')
  })

  test('TSM: dollar market cap converted into Taiwan dollars', () => {
    const { d, r, ratio } = screen('TSM')
    assert.equal(d.profile.fx.pair, 'USDTWD=X')
    // Taiwan dollars over US dollars read 37.7% leverage and 185% liquidity.
    assert.ok(d.balanceSheet.cashAndShortTermInvestments / d.profile.marketCap > 1)
    assert.ok(ratio('leverage').ratio < 0.05, ratio('leverage').ratioPercent)
    assert.ok(ratio('liquidity').ratio < 0.10, ratio('liquidity').ratioPercent)
    assert.equal(r.status, 'COMPLIANT')
  })

  for (const ticker of ['AAPL', 'NESN.SW']) {
    test(`${ticker}: one currency, ratios unchanged`, () => {
      const { d, r, ratio } = screen(ticker)
      assert.equal(d.profile.fx.status, 'same')
      assert.equal(d.profile.marketCapInReportingCurrency, d.profile.marketCap)
      assert.equal(ratio('leverage').ratio, d.balanceSheet.totalDebt / d.profile.marketCap)
      assert.equal(ratio('liquidity').ratio, d.balanceSheet.cashAndShortTermInvestments / d.profile.marketCap)
      assert.equal(r.dataSources.fxRate, null)
      assert.equal(r.status, 'COMPLIANT')
    })
  }

  test('a cents-quoted listing reporting in rand needs no FX (SBK.JO)', () => {
    const { d } = screen('SBK.JO')
    assert.equal(d.profile.currency, 'ZAc')
    assert.equal(d.profile.fx.status, 'same')
    assert.equal(d.profile.marketCapInReportingCurrency, d.profile.marketCap)
  })

  test('no FX rate: market-cap ratios are unavailable, never a mixed-currency figure', () => {
    const raw = { ...load('SHEL.L'), fx: null }
    const { d, r, ratio } = screen('SHEL.L', raw)
    assert.equal(d.profile.fx.status, 'unavailable')
    assert.equal(d.profile.marketCapInReportingCurrency, null)
    for (const key of ['leverage', 'liquidity']) {
      assert.equal(ratio(key).ratio, null)
      assert.match(ratio(key).error, /GBP→USD exchange rate/)
    }
    assert.equal(r.status, 'UNVERIFIED')
    assert.match(r.statusReason, /exchange rate/)
    // Total-assets ratios don't need the rate.
    assert.ok(screen('SHEL.L', raw, 'FTSE').ratio('leverage').ratio > 0)
  })

  test('an FX record for the wrong pair is not used', () => {
    const raw = load('SHEL.L')
    const { d } = screen('SHEL.L', { ...raw, fx: { ...raw.fx, pair: 'GBPEUR=X', to: 'EUR' } })
    assert.equal(d.profile.fx.status, 'unavailable')
    assert.equal(d.profile.marketCapInReportingCurrency, null)
  })
})

describe('dividend currency for purification', () => {
  test('SHEL.L pre-fills the dividend in pounds, not pence or dollars', () => {
    const raw = load('SHEL.L')
    const { d } = screen('SHEL.L', raw)
    assert.equal(d.profile.dividendRate, raw.quote.summaryDetail.dividendRate)
    assert.equal(d.profile.dividendCurrency, 'GBP')
  })

  test('the reporting-currency trailing rate is only a fallback when currencies match', () => {
    const shel = load('SHEL.L')
    const noForward = { ...shel, quote: { ...shel.quote, summaryDetail: { ...shel.quote.summaryDetail, dividendRate: undefined } } }
    assert.equal(screen('SHEL.L', noForward).d.profile.dividendRate, null)

    const msft = load('MSFT')
    const msftNoForward = { ...msft, quote: { ...msft.quote, summaryDetail: { ...msft.quote.summaryDetail, dividendRate: undefined } } }
    assert.equal(
      screen('MSFT', msftNoForward).d.profile.dividendRate,
      msft.quote.summaryDetail.trailingAnnualDividendRate
    )
  })
})

describe('Verify path', () => {
  test('24-month average market cap stays in market cap\'s currency for pence-quoted charts', () => {
    // £229bn today at 4,000p; closes averaging 3,000p → £172bn, not 100× either way.
    const chart = { meta: { currency: 'GBp' }, quotes: [{ close: 2000 }, { close: 4000 }, { close: null }] }
    const avg = averageMarketCapFromChart(chart, { marketCap: 229e9, price: 4000, currency: 'GBp' })
    assert.equal(avg.value, 229e9 * 0.75)
    assert.equal(avg.monthsObserved, 2)
  })

  test('a chart in a different unit from the price is rejected', () => {
    const chart = { meta: { currency: 'GBP' }, quotes: [{ close: 30 }, { close: 40 }] }
    assert.equal(averageMarketCapFromChart(chart, { marketCap: 229e9, price: 4000, currency: 'GBp' }).source, 'unavailable')
  })

  test('EDGAR facts not in the reporting currency are dropped', () => {
    const edgar = {
      cik: '1',
      facts: {
        totalDebt: { value: 10, unit: 'USD' },
        revenue: { value: 99, unit: 'CAD' },
        receivables: null,
      },
    }
    const usd = inReportingCurrency(edgar, 'USD')
    assert.equal(usd.facts.totalDebt.value, 10)
    assert.equal(usd.facts.revenue, null)
    assert.equal(inReportingCurrency(edgar, 'CAD').facts.totalDebt, null)
  })
})
