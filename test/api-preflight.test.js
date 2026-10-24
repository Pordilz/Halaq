import { test } from 'node:test'
import assert from 'node:assert/strict'

// The Android app calls the API cross-origin from https://localhost, so any
// request with an Authorization header is preflighted. A 405 on OPTIONS fails
// the preflight and the real request never runs.
process.env.VITE_SUPABASE_URL ||= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key'

const HANDLERS = [
  'screen/[ticker].js',
  'quote/[ticker].js',
  'trending.js',
  'search.js',
  'verify-screen/[ticker].js',
  'lemonsqueezy/create-checkout.js',
  'lemonsqueezy/create-portal.js',
  'lemonsqueezy/verify-subscription.js',
]

const mockRes = () => ({
  code: null,
  headers: {},
  status(c) { this.code = c; return this },
  setHeader(k, v) { this.headers[k] = v },
  end() { return this },
  json(body) { this.body = body; return this },
})

for (const file of HANDLERS) {
  test(`${file} answers preflight with 204 and rejects other methods`, async () => {
    const { default: handler } = await import(`../api/${file}`)
    const preflight = mockRes()
    await handler({ method: 'OPTIONS', headers: {}, query: {} }, preflight)
    assert.equal(preflight.code, 204)

    const wrong = mockRes()
    await handler({ method: 'DELETE', headers: {}, query: {} }, wrong)
    assert.equal(wrong.code, 405)
  })
}
