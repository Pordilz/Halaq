import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  METHODOLOGY_KEYS,
  getMethodology,
  screenStock,
  screenBusinessActivity,
  calculatePurification,
  calculateHoldingPurification,
} from '../src/services/complianceEngine.js'

// A clean, permissible company; tests override one field at a time.
const profile = (over = {}) => ({
  ticker: 'TEST',
  name: 'Test Co',
  sector: 'Technology',
  industry: 'Software—Application',
  marketCap: 1000,
  ...over,
})
const balanceSheet = (over = {}) => ({
  totalDebt: 100,
  cashAndShortTermInvestments: 100,
  netReceivables: 50,
  totalAssets: 800,
  period: '2026-06-30',
  ...over,
})
const income = (over = {}) => ({
  revenue: 1000,
  interestIncome: 10,
  interestExpense: 5,
  interestDataSource: 'explicit',
  period: '2026-06-30',
  basis: 'TTM',
  ...over,
})

const ratio = (result, key) => result.financialScreen.ratios.find(r => r.key === key)

describe('methodology presets', () => {
  // Pinned against the published sources listed in SHARIAH.md. Changing one
  // of these changes live verdicts — update SHARIAH.md alongside it.
  test('thresholds match the published standards', () => {
    assert.deepEqual(METHODOLOGY_KEYS, ['AAOIFI', 'DJIM', 'SP', 'FTSE'])
    assert.deepEqual(getMethodology('AAOIFI').thresholds, { leverage: 0.30, liquidity: 0.30, receivables: null, haramRevenue: 0.05 })
    assert.deepEqual(getMethodology('DJIM').thresholds, { leverage: 0.30, liquidity: 0.30, receivables: null, haramRevenue: 0.05 })
    assert.deepEqual(getMethodology('SP').thresholds, { leverage: 0.30, liquidity: 0.30, receivables: null, haramRevenue: 0.05 })
    assert.deepEqual(getMethodology('FTSE').thresholds, { leverage: 0.33333, liquidity: 0.33333, receivables: 0.50, haramRevenue: 0.05 })
  })

  test('denominators and averaging windows', () => {
    assert.equal(getMethodology('AAOIFI').denominator, 'marketCap')
    assert.equal(getMethodology('DJIM').marketCapAverageMonths, 24)
    assert.equal(getMethodology('SP').marketCapAverageMonths, 36)
    assert.equal(getMethodology('FTSE').denominator, 'totalAssets')
  })

  test('unknown methodology falls back to AAOIFI', () => {
    assert.equal(getMethodology('NOPE').label, 'AAOIFI')
    assert.equal(screenStock(profile(), balanceSheet(), income(), { methodology: 'NOPE' }).methodologyKey, 'AAOIFI')
  })
})

describe('AAOIFI ratio boundaries', () => {
  test('debt at 29.9% passes, 30.0% fails', () => {
    assert.equal(screenStock(profile(), balanceSheet({ totalDebt: 299 }), income()).status, 'COMPLIANT')
    const atLimit = screenStock(profile(), balanceSheet({ totalDebt: 300 }), income())
    assert.equal(atLimit.status, 'NON_COMPLIANT')
    assert.match(atLimit.statusReason, /Leverage Ratio/)
  })

  test('interest-bearing cash at 30.0% fails', () => {
    const r = screenStock(profile(), balanceSheet({ cashAndShortTermInvestments: 300 }), income())
    assert.equal(r.status, 'NON_COMPLIANT')
    assert.equal(ratio(r, 'liquidity').pass, false)
  })

  test('impermissible income at 4.99% passes, 5.00% fails', () => {
    assert.equal(screenStock(profile(), balanceSheet(), income({ interestIncome: 49.9 })).status, 'COMPLIANT')
    assert.equal(screenStock(profile(), balanceSheet(), income({ interestIncome: 50 })).status, 'NON_COMPLIANT')
  })

  test('has no receivables screen', () => {
    const r = screenStock(profile(), balanceSheet({ netReceivables: 900 }), income())
    assert.equal(ratio(r, 'receivables'), undefined)
    assert.equal(r.status, 'COMPLIANT')
  })
})

describe('impermissible income', () => {
  test('counts interest earned only, never interest paid', () => {
    const r = screenStock(profile(), balanceSheet(), income({ interestIncome: 10, interestExpense: 900 }))
    assert.equal(ratio(r, 'haramIncome').ratio, 0.01)
    assert.equal(r.haramRevenuePercent, 0.01)
    assert.equal(r.status, 'COMPLIANT')
  })

  test('S&P and DJIM divide by revenue plus interest income', () => {
    for (const methodology of ['SP', 'DJIM']) {
      const r = screenStock(profile(), balanceSheet(), income({ interestIncome: 50 }), { methodology })
      assert.equal(ratio(r, 'haramIncome').ratio, 50 / 1050)
      assert.equal(r.status, 'COMPLIANT', methodology)
    }
  })

  test('unavailable interest income is a data gap, not 0%', () => {
    const r = screenStock(profile(), balanceSheet(), income({ interestIncome: null, interestDataSource: 'unavailable' }))
    assert.equal(ratio(r, 'haramIncome').error, 'Data unavailable')
    assert.equal(r.haramRevenuePercent, null)
    assert.equal(r.purificationNote, null)
    // One gap with every other ratio passing keeps the lenient verdict.
    assert.equal(r.status, 'COMPLIANT')
    assert.equal(r.confidence, 'LOW')
  })

  test('legacy debt-derived payloads are treated as unavailable', () => {
    const r = screenStock(profile(), balanceSheet(), income({ interestIncome: 0, interestExpense: 80, interestDataSource: 'debt-derived' }))
    assert.equal(ratio(r, 'haramIncome').error, 'Data unavailable')
  })

  test('an estimate alone never produces NON_COMPLIANT', () => {
    const r = screenStock(profile(), balanceSheet(), income({ interestIncome: 80, interestDataSource: 'estimated' }))
    assert.equal(ratio(r, 'haramIncome').estimated, true)
    assert.equal(r.status, 'UNVERIFIED')
    assert.match(r.statusReason, /estimated at 8\.00%/)
  })

  test('an estimate below the limit passes and is labelled', () => {
    const r = screenStock(profile(), balanceSheet(), income({ interestIncome: 20, interestDataSource: 'estimated' }))
    assert.equal(r.status, 'COMPLIANT')
    assert.equal(r.haramRevenueEstimated, true)
    assert.match(r.purificationNote, /\(estimate\)$/)
  })

  test('an estimate does not soften a real failure elsewhere', () => {
    const r = screenStock(profile(), balanceSheet({ totalDebt: 500 }), income({ interestIncome: 80, interestDataSource: 'estimated' }))
    assert.equal(r.status, 'NON_COMPLIANT')
  })
})

describe('FTSE (total-assets basis)', () => {
  test('measures against total assets with 33.333% limits', () => {
    // 290 / 800 = 36.25% of assets fails FTSE but passes AAOIFI (29% of cap).
    const bs = balanceSheet({ totalDebt: 290 })
    assert.equal(screenStock(profile(), bs, income(), { methodology: 'FTSE' }).status, 'NON_COMPLIANT')
    assert.equal(screenStock(profile(), bs, income(), { methodology: 'AAOIFI' }).status, 'COMPLIANT')
  })

  test('receivables screen includes cash', () => {
    const r = screenStock(profile(), balanceSheet({ netReceivables: 250, cashAndShortTermInvestments: 160 }), income(), { methodology: 'FTSE' })
    assert.equal(ratio(r, 'receivables').ratio, 410 / 800)
    assert.equal(r.status, 'NON_COMPLIANT')
  })

  test('missing total assets is a data gap', () => {
    const r = screenStock(profile(), balanceSheet({ totalAssets: null }), income(), { methodology: 'FTSE' })
    assert.equal(ratio(r, 'leverage').error, 'Denominator unavailable')
    assert.equal(r.status, 'UNVERIFIED')
  })
})

describe('missing data', () => {
  test('no balance sheet at all is UNVERIFIED, never a 0% pass', () => {
    const r = screenStock(
      profile(),
      { totalDebt: null, cashAndShortTermInvestments: null, netReceivables: null, totalAssets: null },
      income()
    )
    assert.equal(ratio(r, 'leverage').error, 'Data unavailable')
    assert.equal(r.status, 'UNVERIFIED')
    assert.equal(r.confidence, 'LOW')
  })

  test('missing market cap is UNVERIFIED', () => {
    assert.equal(screenStock(profile({ marketCap: 0 }), balanceSheet(), income()).status, 'UNVERIFIED')
  })
})

describe('business activity', () => {
  test('conventional banks fail outright', () => {
    const r = screenStock(profile({ sector: 'Financial Services', industry: 'Banks—Diversified' }), balanceSheet(), income())
    assert.equal(r.status, 'NON_COMPLIANT')
    assert.equal(r.businessScreen.status, 'FAIL')
  })

  test('Shariah-certified institutions are compliant despite bank ratios', () => {
    const r = screenStock(
      profile({ ticker: '1120.SR', sector: 'Financial Services', industry: 'Banks—Regional' }),
      balanceSheet({ totalDebt: 900, cashAndShortTermInvestments: 700 }),
      income({ interestIncome: 400 })
    )
    assert.equal(r.status, 'COMPLIANT')
    assert.equal(r.confidence, 'HIGH')
    assert.equal(r.isShariahCertified, true)
    // Financing profit isn't riba — no purification rate (was 40% here).
    assert.equal(r.haramRevenuePercent, null)
    assert.equal(r.purificationNote, null)
  })

  test('mixed businesses that pass the ratios need review', () => {
    assert.equal(screenStock(profile({ industry: 'Restaurants' }), balanceSheet(), income()).status, 'REVIEW_REQUIRED')
  })

  test('a data gap does not let a mixed business skip review', () => {
    // Regression: COST (Discount Stores, sells alcohol) went COMPLIANT when
    // its interest income became a gap.
    const r = screenStock(
      profile({ industry: 'Discount Stores' }),
      balanceSheet(),
      income({ interestIncome: null, interestDataSource: 'unavailable' })
    )
    assert.equal(r.status, 'REVIEW_REQUIRED')
    assert.equal(r.confidence, 'LOW')
  })

  test('missing sector and industry is UNVERIFIED', () => {
    assert.equal(screenStock(profile({ sector: '', industry: '' }), balanceSheet(), income()).status, 'UNVERIFIED')
  })

  test('"Entertainment" is not mistaken for adult entertainment', () => {
    assert.equal(screenBusinessActivity({ sector: 'Communication Services', industry: 'Entertainment' }).status, 'CAUTION')
    assert.equal(screenBusinessActivity({ sector: 'Communication Services', industry: 'Adult Entertainment' }).status, 'FAIL')
  })
})

describe('purification', () => {
  test('dividend × impermissible share', () => {
    const p = calculatePurification(0.018, 250, 'USD')
    assert.equal(p.amount, 4.5)
    assert.equal(p.description, 'Donate $4.50 to charity from this dividend')
  })

  test('holding: shares × dividend per share × rate', () => {
    const p = calculateHoldingPurification({ shares: '50', dividendPerShare: '2', haramRevenuePercent: 0.018, currency: 'ZAR' })
    assert.equal(p.dividends, 100)
    assert.equal(p.amount, 1.8)
    assert.equal(p.description, 'Donate R1.80 to charity from this dividend')
  })

  test('unknown rate and empty inputs say so', () => {
    assert.match(calculatePurification(null, 100).description, /can't be calculated/)
    assert.match(calculateHoldingPurification({ shares: '', dividendPerShare: '', haramRevenuePercent: 0.02 }).description, /Enter the dividend/)
    assert.match(calculatePurification(0, 100).description, /No purification required/)
  })
})
