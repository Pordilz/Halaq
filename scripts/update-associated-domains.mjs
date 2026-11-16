#!/usr/bin/env node
/**
 * Fill the Verified App Link / Universal Link well-known files with your real
 * signing credentials. Safe to re-run: it overwrites both files in place.
 *
 * Usage:
 *   ANDROID_SHA256_FINGERPRINT=<64 hex chars> \
 *   APPLE_TEAM_ID=<alphanumeric team id> \
 *   npm run setup:associated-domains
 *
 * Optional first positional argument: output directory for the .well-known
 * files (defaults to public/.well-known). Used by the test suite to write to
 * a temporary sandbox instead of the repository.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'public', '.well-known')

const FINGERPRINT_RE = /^[0-9a-f]{64}$/i
const TEAM_ID_RE = /^[a-z0-9]{10}$/i

const fingerprint = (process.env.ANDROID_SHA256_FINGERPRINT || '').trim()
const teamId = (process.env.APPLE_TEAM_ID || '').trim()

const problems = []
if (!FINGERPRINT_RE.test(fingerprint)) {
  problems.push('ANDROID_SHA256_FINGERPRINT must be exactly 64 hex characters (the SHA-256 signing certificate fingerprint, colons stripped).')
}
if (!TEAM_ID_RE.test(teamId)) {
  problems.push('APPLE_TEAM_ID must be a 10-character alphanumeric Apple Developer Team ID (e.g. A1B2C3D4E5).')
}
if (problems.length) {
  console.error('Cannot update associated-domain files:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

const assetlinks = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.halaq.app',
      sha256_cert_fingerprints: [fingerprint],
    },
  },
]

const aasa = {
  applinks: {
    apps: [],
    details: [
      {
        appID: `${teamId.toUpperCase()}.com.halaq.app`,
        paths: ['/'],
      },
    ],
  },
}

mkdirSync(OUT_DIR, { recursive: true })
const assetlinksPath = path.join(OUT_DIR, 'assetlinks.json')
const aasaPath = path.join(OUT_DIR, 'apple-app-site-association')
writeFileSync(assetlinksPath, `${JSON.stringify(assetlinks, null, 2)}\n`, 'utf8')
writeFileSync(aasaPath, `${JSON.stringify(aasa, null, 2)}\n`, 'utf8')

console.log('Wrote associated-domain files with real credentials:')
console.log(`  ${path.relative(ROOT, assetlinksPath)}`)
console.log(`  ${path.relative(ROOT, aasaPath)}`)
console.log('')
console.log('Next steps:')
console.log('  1. Redeploy the web app so both files are served from the domain root:')
console.log('       https://halaq.app/.well-known/assetlinks.json')
console.log('       https://halaq.app/.well-known/apple-app-site-association')
console.log('     (Vercel copies everything in public/ to the root of dist/.)')
console.log('  2. Rebuild the native apps (npm run android:build / npm run ios:build).')
console.log('  3. Verify with the ADB Digital Asset Links API and Apple App Search API.')
console.log('  4. Confirm Android App Links and iOS Universal Links open the app.')
