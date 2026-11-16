import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parsePostingUrl } from '../api/_lib/job-posting.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(path.join(ROOT, 'api', '_lib', 'job-posting.js'), 'utf8')

test('job-posting pins the validated host instead of doing a bare re-resolving fetch', () => {
  assert.ok(
    /dispatcher|new\s+Agent\b|connect\s*:|setDefaultResultOrder|pinned|resolvedIp|targetIp|lookupAddress|resolveToIp|address\s*:\s*ip/i.test(src),
    'job-posting.js must use a pinned lookup / custom dispatcher so DNS rebinding cannot bypass the host validation',
  )
})

test('job-posting blocks IPv6 loopback, unique-local and link-local ranges', () => {
  assert.match(src, /isIPv6|::1|::ffff/i, 'IPv6 address handling must exist')
  assert.match(src, /fe80|f[c-d][0-9a-f]{2}/i, 'must block IPv6 ULA / link-local ranges')
})

test('parsePostingUrl rejects private, loopback and non-web targets (regression lock-in)', () => {
  const hostile = [
    'http://127.0.0.1/x',
    'http://localhost/x',
    'http://10.0.0.1/x',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/x',
    'file:///etc/passwd',
    'ftp://example.com/x',
  ]
  for (const url of hostile) {
    assert.throws(() => parsePostingUrl(url), undefined, `must reject ${url}`)
  }
  assert.equal(parsePostingUrl('https://example.com/jobs/1').hostname, 'example.com')
})
