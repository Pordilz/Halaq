import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(path.join(ROOT, 'api', 'screen', '[ticker].js'), 'utf8')

// Strip comments so a comment mentioning getScreeningPayload can't be
// mistaken for the actual upstream call.
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')

test('screen handler checks quota before fetching the screening payload', () => {
  const payloadCall = code.search(/getScreeningPayload\s*\(/)
  const quotaCall = code.search(
    /enforce(?:Free|Anon)?\w*(?:RateLimit|Quota)\s*\(|consume\w*Quota\s*\(/,
  )

  assert.ok(payloadCall >= 0, 'getScreeningPayload call not found in the screen handler')
  assert.ok(quotaCall >= 0, 'quota enforcement call not found in the screen handler')
  assert.ok(
    quotaCall < payloadCall,
    'the quota check must run before getScreeningPayload so rejected requests never hit upstream data providers',
  )
})

test('screen handler returns 429 when the quota check blocks a request', () => {
  assert.match(code, /429|blocked\.status/, 'the handler must return 429 for blocked requests')
})
