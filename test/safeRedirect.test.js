import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeRedirect } from '../src/lib/safeRedirect.js'

test('keeps same-app paths, including query strings', () => {
  assert.equal(safeRedirect('/upgrade'), '/upgrade')
  assert.equal(safeRedirect('/stock/AAPL?tab=ratios'), '/stock/AAPL?tab=ratios')
})

test('rejects anything that could leave the app', () => {
  for (const target of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    '/home\n//evil.example',
    '',
    null,
    undefined,
  ]) {
    assert.equal(safeRedirect(target), '/home', String(target))
  }
})

test('custom fallback', () => {
  assert.equal(safeRedirect('//x', '/screener'), '/screener')
})
