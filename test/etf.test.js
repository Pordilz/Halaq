import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { buildEtfXray } from '../api/_lib/etf.js'
import { getDedicatedShariahFund } from '../src/services/shariahFunds.js'

const fund = (quoteType, holdings) => async () => ({
  price: { quoteType, longName: 'Test Fund', currency: 'USD' },
  fundProfile: { family: 'Test Family', categoryName: 'Large Growth' },
  topHoldings: { stockPosition: 0.99, cashPosition: 0.01, holdings },
})

describe('buildEtfXray', () => {
  test('screens each listed holding and reports coverage', async () => {
    const screened = []
    const x = await buildEtfXray('QQQ', {
      summary: fund('ETF', [
        { symbol: 'AAPL', holdingName: 'Apple', holdingPercent: 0.08 },
        { symbol: 'MSFT', holdingName: 'Microsoft', holdingPercent: 0.06 },
      ]),
      screen: async s => { screened.push(s); return { profile: { ticker: s } } },
    })
    assert.deepEqual(screened.sort(), ['AAPL', 'MSFT'])
    assert.equal(x.fund.name, 'Test Fund')
    assert.equal(x.fund.dedicated, null)
    assert.ok(Math.abs(x.coverage - 0.14) < 1e-9)
    assert.equal(x.holdings[0].data.profile.ticker, 'AAPL')
  })

  test('a holding that fails to screen is reported, not fatal', async () => {
    const x = await buildEtfXray('QQQ', {
      summary: fund('ETF', [{ symbol: 'ZZZZQX', holdingPercent: 0.05 }]),
      screen: async () => { throw new Error('Quote not found for symbol: ZZZZQX') },
    })
    assert.match(x.holdings[0].error, /No data found/)
  })

  test('holdings without a symbol are listed as unscreenable but count toward coverage', async () => {
    const x = await buildEtfXray('QQQ', {
      summary: fund('ETF', [{ holdingName: 'Cash', holdingPercent: 0.02 }, { symbol: 'AAPL', holdingPercent: 0.08 }]),
      screen: async () => ({}),
    })
    assert.deepEqual(x.unscreenable, [{ name: 'Cash', weight: 0.02 }])
    assert.equal(x.holdings.length, 1)
    assert.ok(Math.abs(x.coverage - 0.10) < 1e-9)
  })

  test('a plain equity is rejected as NOT_A_FUND', async () => {
    await assert.rejects(
      buildEtfXray('AAPL', { summary: fund('EQUITY', []), screen: async () => ({}) }),
      err => err.code === 'NOT_A_FUND' && err.statusCode === 400
    )
  })

  test('curated Shariah funds are accepted even when Yahoo calls them equities', async () => {
    const x = await buildEtfXray('STXSHA.JO', { summary: fund('EQUITY', []), screen: async () => ({}) })
    assert.deepEqual(x.fund.dedicated, getDedicatedShariahFund('STXSHA.JO'))
    assert.equal(x.fund.dedicated.provider, 'Satrix')
  })
})

test('dedicated fund lookup is case-insensitive and null for others', () => {
  assert.equal(getDedicatedShariahFund('spus').provider, 'SP Funds')
  assert.equal(getDedicatedShariahFund('SPSK').kind, 'sukuk')
  assert.equal(getDedicatedShariahFund('QQQ'), null)
})
