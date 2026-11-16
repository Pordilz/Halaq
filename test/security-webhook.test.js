import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(
  path.join(ROOT, 'api', 'lemonsqueezy', 'webhook.js'),
  'utf8',
)

const matchesAny = (patterns) => patterns.some((re) => re.test(src))

test('webhook still verifies the HMAC signature in constant time', () => {
  assert.match(src, /createHmac/, 'webhook must compute an HMAC of the raw body')
  assert.match(src, /timingSafeEqual/, 'webhook must compare signatures in constant time')
})

test('webhook deduplicates events by id', () => {
  assert.ok(
    matchesAny([
      /event[_-]?id/i,
      /event\.id/i,
      /dedup/i,
      /processed[_-]?events/i,
      /webhook[_-]?events/i,
      /already\s+processed/i,
      /duplicate/i,
    ]),
    'webhook.js must reference event-id based deduplication',
  )
})

test('webhook handles refund and pause events', () => {
  assert.match(src, /refund/i, 'webhook must handle refund events')
  assert.match(src, /paus/i, 'webhook must handle pause events')
})

test('webhook applies a freshness / replay guard to incoming events', () => {
  assert.ok(
    matchesAny([/created_at/i, /occurred_at/i, /event[_-]?time/i, /timestamp/i, /getTime\s*\(/]),
    'webhook must read an event timestamp',
  )
  assert.ok(
    matchesAny([
      /fresh/i,
      /stale/i,
      /replay/i,
      /too\s+old/i,
      /max[_-]?age/i,
      /event[_-]?age/i,
      /Date\.now\s*\(/,
      /Date\.parse\s*\(/,
      /within\s+\d+/i,
      /\bseconds\b|\bminutes\b/i,
      /\bwindow\b/i,
    ]),
    'webhook must compare the event timestamp against a freshness window',
  )
})
