import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeScreeningPayload } from '../api/_lib/yahoo.js'
import { screenStock } from '../src/services/complianceEngine.js'

// Recorded with scripts/capture-yahoo-fixtures.js. Re-record when Yahoo's
// payload shape changes, then review the golden verdicts below.
const load = ticker =>
  JSON.parse(readFileSync(new URL(`./fixtures/yahoo/${ticker}.json`, import.meta.url), 'utf8'))

const screen = (ticker, raw = load(ticker), methodology = 'AAOIFI') => {
  const d = normalizeScreeningPayload(ticker, raw)
  return { d, r: screenStock(d.profile, d.balanceSheet, d.income, { methodology }) }
}

describe('normalizeScreeningPayload on recorded Yahoo data', () => {
  for (const ticker of ['AAPL', 'MSFT', 'JPM', 'SBK.JO', 'SPUS', 'SHEL.L', 'ULVR.L', 'TSM', 'NESN.SW']) {
    test(`${ticker}: no NaN, and missing values are null rather than fabricated`, () => {
      const { d } = screen(ticker)
      for (const [section, obj] of Object.entries(d)) {
        for (const [key, value] of Object.entries(obj)) {
          assert.ok(!Number.isNaN(value), `${section}.${key} is NaN`)
        }
      }
      assert.ok(['explicit', 'estimated', 'unavailable'].includes(d.income.interestDataSource))
    })
  }

  test('golden AAOIFI verdicts', () => {
    assert.equal(screen('AAPL').r.status, 'COMPLIANT')
    assert.equal(screen('MSFT').r.status, 'COMPLIANT')
    assert.equal(screen('JPM').r.status, 'NON_COMPLIANT')
    assert.equal(screen('SBK.JO').r.status, 'NON_COMPLIANT')
    // An ETF has no operating financials; it is screened via its holdings.
    assert.equal(screen('SPUS').r.status, 'UNVERIFIED')
    // Trade in one currency, report in another (test/currency.test.js).
    assert.equal(screen('SHEL.L').r.status, 'COMPLIANT')
    assert.equal(screen('ULVR.L').r.status, 'COMPLIANT')
    assert.equal(screen('TSM').r.status, 'COMPLIANT')
    assert.equal(screen('NESN.SW').r.status, 'COMPLIANT')
  })

  test('TTM statement dates (Unix seconds from Yahoo) are real dates, not 1970', () => {
    for (const ticker of ['AAPL', 'MSFT', 'JPM', 'SBK.JO']) {
      const raw = load(ticker)
      assert.equal(typeof raw.ttmFinancials[0].date, 'number', `${ticker} fixture should hold Unix seconds`)
      const { d } = screen(ticker, raw)
      assert.equal(d.income.basis, 'TTM')
      for (const period of [d.income.period, d.balanceSheet.period]) {
        assert.match(period, /^\d{4}-\d{2}-\d{2}$/)
        assert.ok(Number(period.slice(0, 4)) >= 2020, `${ticker} period ${period}`)
      }
    }
  })

  test('MSFT reports interest income explicitly; AAPL only via non-operating income', () => {
    assert.equal(screen('MSFT').d.income.interestDataSource, 'explicit')
    assert.equal(screen('AAPL').d.income.interestDataSource, 'estimated')
  })

  test('dividend rate is carried through for the purification calculator', () => {
    assert.ok(screen('MSFT').d.profile.dividendRate > 0)
  })

  test('a ticker with no balance-sheet rows is UNVERIFIED, not a 0% pass', () => {
    const raw = load('MSFT')
    const stripped = {
      ...raw,
      timeSeries: [],
      quote: { ...raw.quote, financialData: { ...raw.quote.financialData, totalDebt: undefined, totalCash: undefined } },
    }
    const { d, r } = screen('MSFT', stripped)
    assert.equal(d.balanceSheet.totalDebt, null)
    assert.equal(d.balanceSheet.cashAndShortTermInvestments, null)
    assert.equal(r.status, 'UNVERIFIED')
  })

  test('an omitted debt line on a reported balance sheet counts as no debt', () => {
    const raw = load('MSFT')
    const [latest, ...rest] = raw.timeSeries
    const { totalDebt, currentDebt, longTermDebt, ...withoutDebt } = latest
    const stripped = {
      ...raw,
      timeSeries: [withoutDebt, ...rest],
      quote: { ...raw.quote, financialData: { ...raw.quote.financialData, totalDebt: undefined } },
    }
    assert.equal(screen('MSFT', stripped).d.balanceSheet.totalDebt, 0)
  })
})
