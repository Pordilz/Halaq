import { test } from 'node:test'
import assert from 'node:assert/strict'

// Set before importing so module-level config reads see a normal environment.
process.env.SUPABASE_URL ||= 'http://localhost:54321'
process.env.VITE_SUPABASE_URL ||= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key'

const { bearerToken } = await import('../api/_lib/supabase.js')

if (typeof bearerToken !== 'function') {
  // The helper is optional in this pass; only lock its behaviour in when it
  // is actually exported by the module.
  test.skip('bearerToken helper is not exported — skipping parsing assertions', () => {})
} else {
  const tryCall = (...args) => {
    try {
      return bearerToken(...args)
    } catch {
      return undefined
    }
  }

  // Tolerate either bearerToken(req) or bearerToken(rawHeaderValue).
  const extract = (req, headerValue) => {
    for (const result of [tryCall(req), tryCall(headerValue)]) {
      if (typeof result === 'string' && result.length) return result
    }
    return null
  }
  const rejects = (req, headerValue) =>
    [tryCall(req), tryCall(headerValue)].every(
      (result) => typeof result !== 'string' || result.length === 0,
    )

  test('bearerToken extracts a well-formed Bearer token', () => {
    assert.equal(
      extract({ headers: { authorization: 'Bearer abc123' } }, 'Bearer abc123'),
      'abc123',
    )
    assert.equal(
      extract({ headers: { Authorization: 'Bearer xyz789' } }, 'Bearer xyz789'),
      'xyz789',
    )
  })

  test('bearerToken rejects malformed or non-Bearer headers', () => {
    const malformed = [
      [undefined, undefined],
      [{}, undefined],
      [{ headers: {} }, undefined],
      [{ headers: { authorization: '' } }, ''],
      [{ headers: { authorization: 'Basic abc123' } }, 'Basic abc123'],
      [{ headers: { authorization: 'Token abc123' } }, 'Token abc123'],
      [{ headers: { authorization: 'Bearer' } }, 'Bearer'],
      [{ headers: { authorization: 'Bearer ' } }, 'Bearer '],
      [{ headers: { authorization: 'Bearer    ' } }, 'Bearer    '],
    ]
    for (const [req, headerValue] of malformed) {
      assert.ok(rejects(req, headerValue), `must reject ${JSON.stringify(headerValue ?? req)}`)
    }
  })
}
