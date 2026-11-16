import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const example = readFileSync(path.join(ROOT, '.env.example'), 'utf8')
const documented = new Set(
  [...example.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*=/gm)].map((m) => m[1]),
)

// Vite's import.meta.env built-ins are framework-provided, not user config.
// VITE_PLATFORM is optional: it falls back to MODE in src/main.jsx and is not
// a deployment setting. Everything else referenced by the app must be
// documented in .env.example.
const EXEMPT = new Set([
  'MODE',
  'DEV',
  'PROD',
  'BASE_URL',
  'SSR',
  'VITE_PLATFORM',
])

const PATTERNS = [
  /process\.env\.([A-Z][A-Z0-9_]*)/g,
  /process\.env\[\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\]/g,
  /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
  /import\.meta\.env\[\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\]/g,
]

function referencedEnvVars() {
  const found = new Set()
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(js|jsx)$/.test(entry.name)) {
        const source = readFileSync(full, 'utf8')
        for (const pattern of PATTERNS) {
          for (const match of source.matchAll(pattern)) found.add(match[1])
        }
      }
    }
  }
  for (const area of ['api', 'server', 'src']) walk(path.join(ROOT, area))
  return found
}

test('.env.example documents every required env var referenced by the app', () => {
  const required = [...referencedEnvVars()]
    .filter((name) => !EXEMPT.has(name))
    .filter((name) => !documented.has(name))
    .sort()
  assert.deepEqual(required, [], `undocumented env vars: ${required.join(', ')}`)
})

test('.env.example includes the core Supabase and billing variables', () => {
  for (const name of [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'LEMON_SQUEEZY_API_KEY',
    'LEMON_SQUEEZY_STORE_ID',
    'LEMON_SQUEEZY_WEBHOOK_SECRET',
    'APP_ORIGIN',
    'VITE_API_BASE_URL',
  ]) {
    assert.ok(documented.has(name), `.env.example is missing ${name}`)
  }
})

test('server-only secrets are not exposed with a VITE_ prefix', () => {
  for (const name of [
    'SUPABASE_SERVICE_ROLE_KEY',
    'LEMON_SQUEEZY_API_KEY',
    'LEMON_SQUEEZY_WEBHOOK_SECRET',
  ]) {
    assert.ok(!documented.has(`VITE_${name}`), `${name} must not be VITE_-prefixed`)
  }
})
