import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeCompanyName, findListings, summarizeListings, SOURCE_ORDER } from '../src/services/ethics.js'

const data = JSON.parse(readFileSync(new URL('../src/content/boycotts.json', import.meta.url)))

test('company names lose legal suffixes, accents and punctuation', () => {
  assert.equal(normalizeCompanyName('The Coca-Cola Company'), 'coca cola')
  assert.equal(normalizeCompanyName('Nestlé S.A.'), 'nestle')
  assert.equal(normalizeCompanyName('HP Inc.'), 'hp')
  assert.equal(normalizeCompanyName('Procter & Gamble Co.'), 'procter and gamble')
})

test('finds a listed company by its Yahoo name or ticker', () => {
  const byName = findListings(data, { name: 'Caterpillar Inc.' })
  const byTicker = findListings(data, { name: 'Unrelated name', ticker: 'CAT' })
  assert.ok(byName.some(m => m.name === 'Caterpillar' && m.via === 'company'))
  assert.ok(byTicker.some(m => m.name === 'Caterpillar'))
})

test('a listed brand is reported against its parent', () => {
  const matches = findListings(data, { name: 'PepsiCo, Inc.', ticker: 'PEP' })
  const soda = matches.find(m => m.name === 'SodaStream')
  assert.ok(soda)
  assert.equal(soda.via, 'brand')
})

test('a company on no list comes back clean', () => {
  const summary = summarizeListings(findListings(data, { name: 'Halaq Test Bakery Ltd', ticker: 'ZZZZ.L' }))
  assert.equal(summary.listed, false)
  assert.equal(summary.sourceCount, 0)
})

test('the summary counts lists, not listings', () => {
  const summary = summarizeListings(findListings(data, { name: 'Booking Holdings Inc.', ticker: 'BKNG' }))
  assert.ok(summary.listed)
  assert.equal(summary.sourceCount, new Set(summary.rows.map(r => r.source)).size)
  assert.deepEqual(summary.sources, SOURCE_ORDER.filter(s => summary.sources.includes(s)))
})

test('every listing names a known source, and every source has a link', () => {
  for (const c of data.companies) {
    assert.ok(c.name && c.listings.length, c.name)
    for (const l of c.listings) assert.ok(SOURCE_ORDER.includes(l.source), `${c.name}: ${l.source}`)
  }
  for (const s of SOURCE_ORDER) assert.match(data.sources[s].url, /^https:\/\//)
})
