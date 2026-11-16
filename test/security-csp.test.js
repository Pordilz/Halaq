import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...parts) => readFileSync(path.join(ROOT, ...parts), 'utf8')

const vercel = JSON.parse(read('vercel.json'))
const html = read('index.html')
const viteConfig = read('vite.config.js')

test('vercel.json publishes a restrictive Content-Security-Policy', () => {
  const policies = []
  for (const rule of vercel.headers || []) {
    for (const header of rule.headers || []) {
      if (String(header.key).toLowerCase() === 'content-security-policy') {
        policies.push(String(header.value))
      }
    }
  }
  assert.ok(policies.length > 0, 'vercel.json must set a Content-Security-Policy header')

  const csp = policies.join(' ; ').toLowerCase()
  for (const directive of ['default-src', 'script-src', 'object-src', 'base-uri', 'frame-ancestors']) {
    assert.match(csp, new RegExp(`\\b${directive}\\b`), `CSP must include the ${directive} directive`)
  }
  assert.match(csp, /object-src\s+'none'/, "CSP must set object-src 'none'")
})

test('index.html has no inline executable scripts (ld+json is allowed)', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  assert.ok(scripts.length > 0, 'expected at least one <script> tag in index.html')

  for (const [, attrs, body] of scripts) {
    const type = (attrs.match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1]?.toLowerCase()
    if (type === 'application/ld+json') continue
    assert.match(
      attrs,
      /\bsrc\s*=/i,
      `inline executable <script> found in index.html: ${body.trim().slice(0, 80)}`,
    )
  }
})

test('the Vite build injects a meta CSP', () => {
  assert.match(
    viteConfig,
    /csp|content-security-policy/i,
    'vite.config.js must configure a Content-Security-Policy',
  )
  assert.match(
    viteConfig,
    /transformIndexHtml|http-equiv|meta/i,
    'the CSP must be injected into the built HTML as a <meta http-equiv> tag',
  )
})
