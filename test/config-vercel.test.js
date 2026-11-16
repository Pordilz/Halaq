import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vercel = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
const corsSource = readFileSync(path.join(ROOT, 'api', '_lib', 'cors.js'), 'utf8')

const headersFor = (source) => {
  const rule = vercel.headers.find((r) => r.source === source)
  return rule ? Object.fromEntries(rule.headers.map((h) => [h.key, h.value])) : {}
}

test('vercel.json sets the required security headers on all responses', () => {
  const all = headersFor('/(.*)')
  assert.equal(all['X-Content-Type-Options'], 'nosniff')
  assert.equal(all['X-Frame-Options'], 'DENY')
  assert.equal(all['Referrer-Policy'], 'strict-origin-when-cross-origin')
  assert.ok(all['Permissions-Policy'], 'Permissions-Policy must be set')
  assert.match(all['Strict-Transport-Security'] || '', /max-age=\d+/)
})

test('the CORS origin is owned at runtime, never published statically', () => {
  // A static ACAO here would duplicate/override the exact origin reflected by
  // applyCors(), breaking credentialed native WebView requests. Vercel may
  // still publish the preflight method/header hints and Vary: Origin; only
  // the origin itself is decided at request time.
  for (const rule of vercel.headers) {
    for (const header of rule.headers) {
      assert.notEqual(
        header.key.toLowerCase(),
        'access-control-allow-origin',
        'static Access-Control-Allow-Origin is not allowed',
      )
    }
  }
  assert.doesNotMatch(
    corsSource,
    /setHeader\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]\s*\)/,
    'the runtime policy must not emit a wildcard origin',
  )
  assert.match(
    corsSource,
    /setHeader\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*origin\s*\)/,
    'applyCors must reflect the exact allowlisted origin',
  )
})

test('vercel.json defines CORS methods/headers/Vary for browser API calls', () => {
  const cors = headersFor('/api/(.*)')
  const methods = cors['Access-Control-Allow-Methods'] || ''
  for (const method of ['GET', 'POST', 'OPTIONS']) {
    assert.ok(methods.includes(method), `Allow-Methods must include ${method}`)
  }
  const allowed = cors['Access-Control-Allow-Headers'] || ''
  for (const header of ['Content-Type', 'Authorization']) {
    assert.ok(allowed.includes(header), `Allow-Headers must include ${header}`)
  }
  assert.match(cors['Vary'] || '', /\bOrigin\b/, 'API responses must vary by Origin')
})

test('the runtime CORS policy uses an explicit origin allowlist', () => {
  assert.match(corsSource, /export function isAllowedOrigin/)
  assert.match(corsSource, /export function applyCors/)
  assert.match(corsSource, /setHeader\(\s*['"]Vary['"]\s*,\s*['"]Origin['"]\s*\)/)
  assert.match(corsSource, /process\.env\.APP_ORIGIN/, 'allowlist must be configurable')
  assert.match(
    corsSource,
    /setHeader\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*origin\s*\)/,
    'allowed origins must be reflected exactly, never wildcarded',
  )
})

test('vercel.json builds Vite to dist and SPA-rewrites non-asset paths', () => {
  assert.equal(vercel.framework, 'vite')
  assert.equal(vercel.buildCommand, 'npm run build')
  assert.equal(vercel.outputDirectory, 'dist')
  assert.ok(vercel.rewrites.some((r) => r.destination === '/index.html'))
})

test('every API function applies CORS and handles preflight', () => {
  // webhook.js is a server-to-server Lemon Squeezy callback and is never
  // preflighted by a browser; it still applies CORS but rejects non-POST.
  const NO_PREFLIGHT = new Set(['lemonsqueezy/webhook.js'])

  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== '_lib') walk(full)
      } else if (entry.name.endsWith('.js')) {
        files.push(path.relative(path.join(ROOT, 'api'), full))
      }
    }
  }
  walk(path.join(ROOT, 'api'))

  assert.ok(files.length > 0, 'no API functions found')
  for (const relative of files) {
    const source = readFileSync(path.join(ROOT, 'api', relative), 'utf8')
    assert.match(source, /applyCors\s*\(/, `${relative} must apply the CORS policy`)
    if (NO_PREFLIGHT.has(relative)) {
      assert.match(source, /req\.method\s*!==\s*['"]POST['"]/, `${relative} must reject non-POST`)
    } else {
      assert.match(
        source,
        /req\.method\s*===\s*['"]OPTIONS['"]/,
        `${relative} must handle OPTIONS preflight`,
      )
    }
  }
})
