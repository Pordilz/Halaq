import { test } from 'node:test'
import assert from 'node:assert/strict'
import { byDateDesc, yahooDate, yahooDay } from '../api/_lib/yahoo-dates.js'

test('Unix seconds, milliseconds, ISO strings and Dates all read as the same day', () => {
  const seconds = 1782777600 // 2026-06-30, as Yahoo's trailing series sends it
  for (const value of [seconds, seconds * 1000, String(seconds), '2026-06-30T00:00:00.000Z', new Date(seconds * 1000)]) {
    assert.equal(yahooDay(value), '2026-06-30', `input ${JSON.stringify(value)}`)
  }
})

test('missing or unreadable dates are N/A, never 1970', () => {
  for (const value of [undefined, null, '', 'not a date']) {
    assert.equal(yahooDate(value), null)
    assert.equal(yahooDay(value), 'N/A')
  }
})

test('rows sort newest first whatever their date format, undated last', () => {
  const rows = [
    { id: 'undated' },
    { id: 'mar', date: '2026-03-31T00:00:00.000Z' },
    { id: 'jun', date: 1782777600 },
    { id: 'dec', date: new Date('2025-12-31T00:00:00.000Z') },
  ]
  assert.deepEqual([...rows].sort(byDateDesc).map(r => r.id), ['jun', 'mar', 'dec', 'undated'])
})
