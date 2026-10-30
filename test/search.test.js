import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickSearchResults } from '../api/_lib/search.js'

const quote = (symbol, exchange, quoteType = 'EQUITY') => ({ symbol, exchange, quoteType, shortname: symbol })
const symbols = quotes => pickSearchResults(quotes).map(r => r.symbol)

test('offers listings worldwide, not just the US and Johannesburg', () => {
  const quotes = [quote('NESN.SW', 'EBS'), quote('2222.SR', 'SAU'), quote('KFH.KW', 'KUW'), quote('TLKM.JK', 'JKT'), quote('SHP.JO', 'JNB'), quote('AAPL', 'NMS'), quote('SIE.DE', 'GER')]
  assert.deepEqual(symbols(quotes), quotes.map(q => q.symbol))
})

test('drops OTC and German regional duplicates of a main listing', () => {
  assert.deepEqual(
    symbols([quote('TLKM.JK', 'JKT'), quote('PTI.MU', 'MUN'), quote('PTI.HA', 'HAN'), quote('NSRGY', 'OID')]),
    ['TLKM.JK']
  )
})

test('keeps a secondary listing when a company has nothing else', () => {
  assert.deepEqual(symbols([quote('SRGHY', 'PNK')]), ['SRGHY'])
})

test('skips non-tradable result types and bad input', () => {
  assert.deepEqual(symbols([quote('^GSPC', 'SNP', 'INDEX'), quote('BTC-USD', 'CCC', 'CRYPTOCURRENCY'), {}]), [])
  assert.deepEqual(pickSearchResults(undefined), [])
})

test('returns at most eight results in the shape the screener reads', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ ...quote(`T${i}.L`, 'LSE'), exchDisp: 'London' }))
  const results = pickSearchResults(many)
  assert.equal(results.length, 8)
  assert.deepEqual(results[0], { symbol: 'T0.L', name: 'T0.L', exchange: 'London', type: 'EQUITY' })
})
