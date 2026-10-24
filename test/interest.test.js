import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractInterest, numOrNull } from '../api/_lib/interest.js'

const row = fields => key => numOrNull(fields[key])

test('numOrNull keeps unknown distinct from zero', () => {
  assert.equal(numOrNull(undefined), null)
  assert.equal(numOrNull(null), null)
  assert.equal(numOrNull('abc'), null)
  assert.equal(numOrNull(0), 0)
  assert.equal(numOrNull('12.5'), 12.5)
})

test('reported interest income is explicit', () => {
  assert.deepEqual(extractInterest(row({ interestIncome: 40, interestExpense: 90 })), {
    interestIncome: 40, interestExpense: 90, dataSource: 'explicit',
  })
  assert.equal(extractInterest(row({ interestIncomeNonOperating: 12 })).interestIncome, 12)
})

test('interest expense alone is not interest income', () => {
  const r = extractInterest(row({ interestExpense: 90 }))
  assert.equal(r.dataSource, 'unavailable')
  assert.equal(r.interestIncome, null)
  assert.equal(r.interestExpense, 90)
})

test('derives income from net non-operating interest plus expense', () => {
  const r = extractInterest(row({ netNonOperatingInterestIncomeExpense: -20, interestExpenseNonOperating: 50 }))
  assert.equal(r.interestIncome, 30)
  assert.equal(r.dataSource, 'explicit')
})

test('falls back to positive non-operating income as an estimate', () => {
  const r = extractInterest(row({ otherNonOperatingIncomeExpenses: 7 }))
  assert.equal(r.interestIncome, 7)
  assert.equal(r.dataSource, 'estimated')
})

test('negative non-operating income gives no estimate', () => {
  assert.equal(extractInterest(row({ otherNonOperatingIncomeExpenses: -7 })).dataSource, 'unavailable')
})
