import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...parts) => readFileSync(path.join(ROOT, ...parts), 'utf8')

// The handlers import the Supabase helper, which reads env at module load.
process.env.SUPABASE_URL ||= 'http://localhost:54321'
process.env.VITE_SUPABASE_URL ||= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key'
process.env.APP_ORIGIN = 'https://halaq.app'
process.env.VITE_APP_URL = 'https://halaq.app'

const HANDLERS = [
  { label: 'api/batch.js', file: 'api/batch.js' },
  { label: 'api/preferences/methodology.js', file: 'api/preferences/methodology.js' },
]

const mockRes = () => {
  const headers = Object.create(null)
  return {
    code: null,
    headers,
    body: undefined,
    status(c) { this.code = c; return this },
    setHeader(k, v) { headers[String(k).toLowerCase()] = v; return this },
    end() { return this },
    json(body) { this.body = body; return this },
  }
}

// ---------------------------------------------------------------------------
// (a) Both new handlers exist and gate CORS / OPTIONS / method correctly.
// ---------------------------------------------------------------------------

for (const { label, file } of HANDLERS) {
  test(`${label} exists and exports a default handler`, async () => {
    assert.ok(existsSync(path.join(ROOT, file)), `${file} must exist`)
    const mod = await import(`../${file}`)
    assert.equal(typeof mod.default, 'function', `${file} must export a default handler`)
  })

  test(`${label} applies CORS, answers OPTIONS with 204 and rejects other methods`, async () => {
    const { default: handler } = await import(`../${file}`)

    const preflight = mockRes()
    await handler(
      { method: 'OPTIONS', headers: { origin: 'capacitor://localhost' } },
      preflight,
    )
    assert.equal(preflight.code, 204)
    // applyCors always sets Vary and reflects only allowlisted origins.
    assert.match(preflight.headers['vary'] || '', /Origin/i)
    assert.equal(preflight.headers['access-control-allow-origin'], 'capacitor://localhost')

    const disallowed = mockRes()
    await handler(
      { method: 'OPTIONS', headers: { origin: 'https://evil.example' } },
      disallowed,
    )
    assert.equal(disallowed.code, 204)
    assert.equal(disallowed.headers['access-control-allow-origin'], undefined)

    const wrongMethod = mockRes()
    await handler({ method: 'DELETE', headers: {} }, wrongMethod)
    assert.equal(wrongMethod.code, 405)
    assert.match(wrongMethod.headers['allow'] || '', /POST/)
    assert.match(wrongMethod.headers['allow'] || '', /OPTIONS/)
  })

  test(`${label} source enforces strict bearer auth and POST-only handling`, () => {
    const src = read(file)
    assert.match(src, /applyCors\(req, res\)/)
    assert.match(src, /req\.method === 'OPTIONS'/)
    assert.match(src, /req\.method !== 'POST'/)
    assert.match(src, /bearerToken\(req\)/)
    assert.match(src, /getUserFromToken/)
    // No raw upstream errors echoed back to callers.
    assert.doesNotMatch(src, /res\.json\(\{\s*error:\s*err(?:\.message)?\s*\}/)
  })
}

test('both handlers re-read the paid tier from the DB before doing work', () => {
  const batch = read('api', 'batch.js')
  const prefs = read('api', 'preferences', 'methodology.js')
  for (const [name, src] of [['batch', batch], ['preferences', prefs]]) {
    assert.match(src, /new Set\(\['pro', 'scholar', 'admin'\]\)/, `${name} must allow only paid tiers`)
    assert.match(src, /profile\?\.subscription_tier/, `${name} must read tier from the fetched profile`)
  }
  // Methodology writes go through the service-role client, which the new
  // trigger permits; an anon/authenticated client cannot satisfy it.
  assert.match(prefs, /getSupabaseAdmin/)
  assert.match(prefs, /\.update\(\{\s*methodology:/)
})

test('the batch endpoint bounds input, concurrency and latency, and never exposes raw errors', () => {
  const src = read('api', 'batch.js')
  assert.match(src, /MAX_TICKERS = 20/)
  assert.match(src, /CHUNK_SIZE = 4/)
  assert.match(src, /PER_TICKER_TIMEOUT_MS/)
  assert.match(src, /Promise\.race/)
  assert.match(src, /getScreeningPayload/)
  assert.match(src, /screenStock/)
  assert.match(src, /status\(503\)/)
  // A generic message only — no interpolation of an upstream error.
  assert.match(src, /GENERIC_UPSTREAM_ERROR/)
})

test('the methodology endpoint validates against the engine allowlist', () => {
  const src = read('api', 'preferences', 'methodology.js')
  assert.match(src, /METHODOLOGY_KEYS/)
  assert.match(src, /METHODOLOGY_KEYS\.includes\(requested\)/)
  assert.match(src, /FREE_METHODOLOGY = 'AAOIFI'/)
  assert.match(src, /requested !== FREE_METHODOLOGY/)
})

// ---------------------------------------------------------------------------
// (b) Migration 012 locks methodology while keeping the service_role bypass.
// ---------------------------------------------------------------------------

test('migration 012 locks methodology and keeps the service_role bypass', () => {
  const sql = read('supabase', 'migrations', '012_lock_methodology.sql')

  assert.match(sql, /NEW\.methodology\s+IS\s+DISTINCT\s+FROM\s+OLD\.methodology/,
    'the trigger must detect changes to methodology')
  assert.match(sql, /IF\s+auth\.role\(\)\s*=\s*'service_role'\s+THEN[\s\S]{0,120}RETURN NEW/,
    'service_role must still bypass the lock')
  assert.match(sql, /SET search_path = ''/)
  assert.match(sql, /RAISE EXCEPTION 'methodology can only be modified by the preferences API'/)

  // All original locks from 006/010 are still present — none were weakened.
  for (const field of [
    'subscription_tier', 'subscription_status', 'subscription_period_end',
    'stripe_subscription_id', 'billing_event_at', 'daily_search_count',
    'daily_search_reset_at',
  ]) {
    assert.match(sql, new RegExp(`NEW\\.${field}\\s+IS\\s+DISTINCT\\s+FROM\\s+OLD\\.${field}`),
      `the original ${field} lock must be preserved`)
  }

  // Fully qualified function, explicit public EXECUTE revocation, idempotent
  // trigger replacement.
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.profiles_lock_billing_fields\(\)/)
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.profiles_lock_billing_fields\(\) FROM PUBLIC, anon, authenticated/)
  assert.match(sql, /DROP TRIGGER IF EXISTS profiles_lock_billing ON public\.profiles/)
  assert.match(sql, /CREATE TRIGGER profiles_lock_billing[\s\S]{0,200}EXECUTE FUNCTION public\.profiles_lock_billing_fields\(\)/)
})

// ---------------------------------------------------------------------------
// (c) Batch.jsx delegates screening to the API instead of doing it in-browser.
// ---------------------------------------------------------------------------

test('Batch.jsx no longer fetches Yahoo or screens in the browser', () => {
  const src = read('src', 'pages', 'Batch.jsx')
  assert.doesNotMatch(src, /fetchAllScreeningData/)
  assert.doesNotMatch(src, /screenStock/)
  assert.doesNotMatch(src, /yahooFinanceApi/)
  // The shared API helper is used instead, and the Pro gate UX is preserved.
  assert.match(src, /import \{ screenBatch \} from '..\/services\/halaqApi'/)
  assert.match(src, /screenBatch\(tickers\)/)
  assert.match(src, /<FeatureGate/)
  assert.match(src, /MAX_TICKERS = 20/)
  // Loading / error / partial-result handling.
  assert.match(src, /setError\(/)
  assert.match(src, /role="alert"/)
  assert.match(src, /r\.error/)
})

test('halaqApi exposes defensive screenBatch and updateMethodology helpers', () => {
  const src = read('src', 'services', 'halaqApi.js')
  assert.match(src, /export async function screenBatch\(tickers\)/)
  assert.match(src, /export async function updateMethodology\(methodology\)/)
  assert.match(src, /postJson\('\/batch', \{ tickers \}\)/)
  assert.match(src, /postJson\('\/preferences\/methodology', \{ methodology \}\)/)
  assert.match(src, /normalizeBatchResult/)
})

// ---------------------------------------------------------------------------
// (d) Profile.jsx no longer writes methodology directly from the client.
// ---------------------------------------------------------------------------

test('Profile.jsx changes methodology only through the API helper', () => {
  const src = read('src', 'pages', 'Profile.jsx')
  assert.doesNotMatch(src, /\.update\(\s*\{\s*methodology/,
    'Profile.jsx must not write methodology with a direct Supabase update')
  assert.match(src, /updateMethodology\(/)
  assert.match(src, /import \{[^}]*updateMethodology[^}]*\} from '..\/services\/halaqApi'/s)
  // Optimistic UI + rollback + visible error are retained.
  assert.match(src, /setMethodology\(next\)/)
  assert.match(src, /setMethodology\(previous\)/)
  assert.match(src, /setBillingError/)
})
