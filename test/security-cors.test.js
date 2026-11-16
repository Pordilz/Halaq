import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...parts) => readFileSync(path.join(ROOT, ...parts), 'utf8')

const corsSource = read('api', '_lib', 'cors.js')
const vercel = JSON.parse(read('vercel.json'))

// The allowlist is evaluated per request, so configuring it before the tests
// is enough (node:test runs each test file in its own process).
process.env.APP_ORIGIN = 'https://halaq.app'
process.env.APP_ORIGINS = 'https://halaq.app'
process.env.VITE_APP_URL = 'https://halaq.app'

const mockRes = () => {
  const headers = Object.create(null)
  return {
    headers,
    setHeader(key, value) { headers[String(key).toLowerCase()] = value },
  }
}

test('cors.js exports an exact-match allowlist API', async () => {
  const cors = await import('../api/_lib/cors.js')
  assert.equal(typeof cors.applyCors, 'function', 'applyCors must be exported')
  assert.equal(typeof cors.isAllowedOrigin, 'function', 'isAllowedOrigin must be exported')
  assert.equal(typeof cors.allowedOrigins, 'function', 'allowedOrigins must be exported')
})

test('the allowlist contains the native/localhost origins', async () => {
  const { allowedOrigins } = await import('../api/_lib/cors.js')
  const origins = allowedOrigins().map((o) => String(o).toLowerCase())
  for (const expected of ['capacitor://localhost', 'https://localhost', 'http://localhost']) {
    assert.ok(origins.includes(expected), `allowlist must contain ${expected}`)
  }
})

test('origin matching is exact — no suffix, prefix or scheme tricks', async () => {
  const { isAllowedOrigin } = await import('../api/_lib/cors.js')
  assert.equal(isAllowedOrigin('https://halaq.app'), true)
  for (const hostile of [
    'https://halaq.app.evil.example',
    'https://evil-halaq.app',
    'https://evil.example/?next=https://halaq.app',
    'http://halaq.app',
    '',
    null,
    undefined,
  ]) {
    assert.equal(isAllowedOrigin(hostile), false, `must reject origin: ${hostile}`)
  }
})

test('applyCors reflects only exact origins, never a wildcard, and always sets Vary', async () => {
  const { applyCors } = await import('../api/_lib/cors.js')

  const allowed = mockRes()
  const returned = applyCors({ headers: { origin: 'capacitor://localhost' } }, allowed)
  assert.equal(allowed.headers['access-control-allow-origin'], 'capacitor://localhost')
  assert.notEqual(allowed.headers['access-control-allow-origin'], '*', 'never reflect a wildcard')
  assert.match(allowed.headers['vary'] || '', /\bOrigin\b/i, 'Vary: Origin must be set')
  assert.equal(returned, 'capacitor://localhost')

  for (const origin of ['https://evil.example', 'https://halaq.app.evil.example']) {
    const res = mockRes()
    applyCors({ headers: { origin } }, res)
    assert.equal(res.headers['access-control-allow-origin'], undefined, `must not emit ACAO for ${origin}`)
    assert.match(res.headers['vary'] || '', /\bOrigin\b/i, 'Vary must be set even for disallowed origins')
  }

  const noOrigin = mockRes()
  applyCors({ headers: {} }, noOrigin)
  assert.equal(noOrigin.headers['access-control-allow-origin'], undefined)
  assert.match(noOrigin.headers['vary'] || '', /\bOrigin\b/i)
})

test('source never writes a wildcard Access-Control-Allow-Origin', () => {
  assert.doesNotMatch(
    corsSource,
    /setHeader\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]\s*\)/,
  )
  assert.doesNotMatch(corsSource, /allowOrigins\(\)\.includes\(\s*['"]\*['"]\s*\)/)
})

test('vercel.json publishes no static, wildcard Access-Control-Allow-Origin', () => {
  // The ACAO is the security-sensitive header: it must be reflected at request
  // time by applyCors() against the exact-match allowlist. Preflight
  // method/header hints and Vary: Origin may still be published statically.
  for (const rule of vercel.headers || []) {
    for (const header of rule.headers || []) {
      if (String(header.key).toLowerCase() === 'access-control-allow-origin') {
        assert.fail(
          `static ${header.key} must be removed from vercel.json — the origin is enforced at request time`,
        )
      }
      assert.notEqual(
        String(header.value).trim(),
        '*',
        'no static security header may use a wildcard value',
      )
    }
  }
})
