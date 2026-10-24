import { test } from 'node:test'
import assert from 'node:assert/strict'
import { needsScreen } from '../src/lib/screenFreshness.js'

const HOUR = 60 * 60 * 1000
const now = Date.parse('2026-10-24T12:00:00Z')
const ago = ms => new Date(now - ms).toISOString()

test('rows without a verdict are screened', () => {
  assert.equal(needsScreen({ status: null }, now), true)
})

test('saved verdicts are refreshed after a day — including legacy rows never timestamped', () => {
  assert.equal(needsScreen({ status: 'COMPLIANT', screenedAt: ago(2 * HOUR) }, now), false)
  assert.equal(needsScreen({ status: 'COMPLIANT', screenedAt: ago(25 * HOUR) }, now), true)
  assert.equal(needsScreen({ status: 'COMPLIANT', screenedAt: null }, now), true)
})

test('a recent Verify result is not overwritten by a fast screen', () => {
  const verified = { status: 'COMPLIANT', dataSourcesUsed: { usedEdgar: true } }
  assert.equal(needsScreen({ ...verified, screenedAt: ago(3 * 24 * HOUR) }, now), false)
  assert.equal(needsScreen({ ...verified, screenedAt: ago(8 * 24 * HOUR) }, now), true)
})
