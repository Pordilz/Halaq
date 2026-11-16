import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...parts) => readFileSync(path.join(ROOT, ...parts), 'utf8')

const assetlinksRaw = read('public', '.well-known', 'assetlinks.json')
const aasaRaw = read('public', '.well-known', 'apple-app-site-association')
const manifest = read('android', 'app', 'src', 'main', 'AndroidManifest.xml')
const netConfig = read('android', 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml')
const mainActivity = read('android', 'app', 'src', 'main', 'java', 'com', 'halaq', 'app', 'MainActivity.java')
const appDelegate = read('ios', 'App', 'App', 'AppDelegate.swift')
const entitlements = read('ios', 'App', 'App', 'App.entitlements')
const pbxproj = read('ios', 'App', 'App.xcodeproj', 'project.pbxproj')
const mainJsx = read('src', 'main.jsx')
const readme = read('README.md')
const pkg = JSON.parse(read('package.json'))

// ---------------------------------------------------------------------------
// (a) Well-known association files
// ---------------------------------------------------------------------------
test('assetlinks.json has the correct structure and a documented fingerprint placeholder', () => {
  const assetlinks = JSON.parse(assetlinksRaw)
  assert.ok(Array.isArray(assetlinks), 'assetlinks.json must be an array')
  assert.equal(assetlinks[0].relation[0], 'delegate_permission/common.handle_all_urls')
  assert.equal(assetlinks[0].target.namespace, 'android_app')
  assert.equal(assetlinks[0].target.package_name, 'com.halaq.app')
  assert.deepEqual(assetlinks[0].target.sha256_cert_fingerprints, ['REPLACE_WITH_SHA256_FINGERPRINT'])

  assert.match(readme, /REPLACE_WITH_SHA256_FINGERPRINT/, 'README must document the Android placeholder')
  assert.match(readme, /\.well-known\/assetlinks\.json/, 'README must document the serving path')
})

test('apple-app-site-association has the correct applinks structure and team-id placeholder', () => {
  const aasa = JSON.parse(aasaRaw)
  assert.deepEqual(aasa.applinks.apps, [])
  assert.equal(aasa.applinks.details.length, 1)
  assert.equal(aasa.applinks.details[0].appID, 'REPLACE_WITH_TEAM_ID.com.halaq.app')
  assert.deepEqual(aasa.applinks.details[0].paths, ['/'])

  assert.match(readme, /REPLACE_WITH_TEAM_ID/, 'README must document the Apple placeholder')
  assert.match(readme, /\.well-known\/apple-app-site-association/, 'README must document the serving path')
  // Vercel serves public/ at the domain root; README must call that out.
  assert.match(readme, /public\//, 'README must explain that public/ is served at the root')
})

// ---------------------------------------------------------------------------
// (b) update-associated-domains.mjs validation + writes
// ---------------------------------------------------------------------------
const baseEnv = { ...process.env }
delete baseEnv.ANDROID_SHA256_FINGERPRINT
delete baseEnv.APPLE_TEAM_ID

const runSetup = (env, outDir) => spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts', 'update-associated-domains.mjs'), outDir],
  { cwd: ROOT, env: { ...baseEnv, ...env }, encoding: 'utf8' },
)

test('package.json exposes the setup:associated-domains script', () => {
  assert.equal(pkg.scripts['setup:associated-domains'], 'node scripts/update-associated-domains.mjs')
})

test('update script rejects a malformed fingerprint and a malformed team id', () => {
  const outDir = mkdtempSync(path.join(tmpdir(), 'halaq-domains-invalid-'))
  try {
    const badFingerprint = runSetup(
      { ANDROID_SHA256_FINGERPRINT: 'abc123', APPLE_TEAM_ID: 'A1B2C3D4E5' },
      outDir,
    )
    assert.equal(badFingerprint.status, 1)
    assert.match(badFingerprint.stderr, /ANDROID_SHA256_FINGERPRINT/)

    const badTeam = runSetup(
      { ANDROID_SHA256_FINGERPRINT: 'a'.repeat(64), APPLE_TEAM_ID: 'BAD-ID!' },
      outDir,
    )
    assert.equal(badTeam.status, 1)
    assert.match(badTeam.stderr, /APPLE_TEAM_ID/)
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
})

test('update script validates real values and writes both well-known files', () => {
  const outDir = mkdtempSync(path.join(tmpdir(), 'halaq-domains-valid-'))
  try {
    const fingerprint = '9'.repeat(64)
    const result = runSetup(
      { ANDROID_SHA256_FINGERPRINT: fingerprint, APPLE_TEAM_ID: 'a1b2c3d4e5' },
      outDir,
    )
    assert.equal(result.status, 0, result.stderr)

    const writtenAssets = JSON.parse(readFileSync(path.join(outDir, 'assetlinks.json'), 'utf8'))
    assert.equal(writtenAssets[0].target.sha256_cert_fingerprints[0], fingerprint)
    assert.equal(writtenAssets[0].target.package_name, 'com.halaq.app')

    const writtenAasa = JSON.parse(readFileSync(path.join(outDir, 'apple-app-site-association'), 'utf8'))
    assert.equal(writtenAasa.applinks.details[0].appID, 'A1B2C3D4E5.com.halaq.app')
    assert.deepEqual(writtenAasa.applinks.details[0].paths, ['/'])

    assert.match(result.stdout, /well-known|Next steps/)
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// (c) Manifest: autoVerify + network security config (pins safely disabled)
// ---------------------------------------------------------------------------
test('AndroidManifest declares verified HTTPS App Links and keeps the custom scheme', () => {
  assert.match(manifest, /android:autoVerify\s*=\s*"true"/, 'autoVerify must be enabled')
  assert.match(manifest, /android:scheme\s*=\s*"https"/, 'an https intent-filter is required')
  assert.match(manifest, /android:host\s*=\s*"halaq\.app"/, 'host must be exactly halaq.app')
  assert.match(manifest, /@string\/custom_url_scheme/, 'legacy custom-scheme filter must be kept')
})

test('manifest references the network security config, whose placeholder pin-set is disabled', () => {
  assert.match(
    manifest,
    /android:networkSecurityConfig\s*=\s*"@xml\/network_security_config"/,
    'the application must reference @xml/network_security_config',
  )
  assert.match(netConfig, /<pin-set expiration="2027-01-01">/)
  assert.match(netConfig, /REPLACE_WITH_BASE64_SPKI_SHA256_PIN/)
  assert.match(netConfig, /supabase\.co/, 'Supabase host must be documented')
  assert.match(netConfig, /halaq\.app/, 'halaq.app host must be documented')
  assert.match(netConfig, /openssl s_client/, 'pin-generation instructions must be present')

  // Safety: stripping XML comments must remove every pin-set, so no bogus pin
  // is ever enforced against production while the placeholders remain.
  const withoutComments = netConfig.replace(/<!--[\s\S]*?-->/g, '')
  assert.doesNotMatch(withoutComments, /<pin-set/, 'placeholder pin-sets must stay commented out')
})

// ---------------------------------------------------------------------------
// (d) MainActivity: FLAG_SECURE + non-blocking root detection
// ---------------------------------------------------------------------------
test('MainActivity applies FLAG_SECURE and posts a non-blocking root warning', () => {
  assert.match(mainActivity, /getWindow\(\)\.addFlags/)
  assert.match(mainActivity, /WindowManager\.LayoutParams\.FLAG_SECURE/)
  assert.match(mainActivity, /\/system\/(bin|xbin)\/su|\/sbin\/su/, 'must check common su paths')
  assert.match(mainActivity, /Build\.TAGS/, 'must check build tags')
  assert.match(mainActivity, /halaq:device-integrity/)
  assert.match(mainActivity, /evaluateJavascript/)
  assert.match(mainActivity, /Log\.w/, 'must emit a console warning')
  assert.doesNotMatch(
    mainActivity,
    /\b(System\.exit|finish|killProcess|android\.os\.Process)\s*\(/,
    'detection must never exit or terminate the app',
  )
})

// ---------------------------------------------------------------------------
// (e) AppDelegate: capture detection, jailbreak check, entitlement wiring
// ---------------------------------------------------------------------------
test('AppDelegate observes screen capture and runs a non-blocking jailbreak check', () => {
  assert.match(appDelegate, /UIScreen\.capturedDidChangeNotification/)
  assert.match(appDelegate, /UIScreen\.main\.isCaptured/)
  assert.match(appDelegate, /addSubview/, 'must add a privacy overlay when captured')
  assert.match(appDelegate, /removeFromSuperview/, 'must restore the overlay when capture ends')
  assert.match(appDelegate, /isJailbroken\(\)/)
  assert.match(appDelegate, /Cydia\.app/, 'must check jailbreak paths')
  assert.match(appDelegate, /canOpenURL/, 'must check jailbreak URL schemes')
  assert.match(appDelegate, /write\(toFile:/, 'must probe the sandbox')
  assert.match(appDelegate, /halaq:device-integrity/)
  assert.match(appDelegate, /evaluateJavaScript/)
  // Universal Links must still be forwarded to Capacitor's web-layer handler.
  assert.match(appDelegate, /ApplicationDelegateProxy\.shared\.application\(application, continue: userActivity/)
  assert.doesNotMatch(appDelegate, /\b(exit\(0\)|fatalError|abort\(\))/, 'must never terminate')
})

test('iOS project wires the Associated Domains entitlement', () => {
  assert.match(entitlements, /com\.apple\.developer\.associated-domains/)
  assert.match(entitlements, /applinks:halaq\.app/)
  assert.match(pbxproj, /CODE_SIGN_ENTITLEMENTS\s*=\s*App\/App\.entitlements/)
  assert.match(pbxproj, /com\.apple\.AssociatedDomains/)
  assert.match(pbxproj, /App\.entitlements/)
})

// ---------------------------------------------------------------------------
// (f) main.jsx: verified HTTPS links accepted, lookalike hosts rejected
// ---------------------------------------------------------------------------
test('main.jsx parser accepts verified https://halaq.app links and rejects other hosts', () => {
  const start = mainJsx.indexOf('const parseIncoming = raw =>')
  const end = mainJsx.indexOf('// END deep-link parser', start)
  assert.notEqual(start, -1, 'parseIncoming must exist in main.jsx')
  assert.notEqual(end, -1, 'parser marker must exist in main.jsx')

  // Execute the exact untrusted-input parser outside the browser.
  const source = mainJsx.slice(start, end)
  const parseIncoming = new Function(
    'DEEP_LINK_SCHEME',
    'VERIFIED_HOST',
    `${source}\nreturn parseIncoming`,
  )('com.halaq.app://', 'halaq.app')

  // Verified links map onto the same raw path/query as the custom scheme.
  assert.deepEqual(parseIncoming('https://halaq.app/stock/AAPL'), {
    rawPath: '/stock/AAPL', rawQuery: '',
  })
  assert.deepEqual(parseIncoming('HTTPS://HALAQ.APP/etf/SPUS?url=example.com'), {
    rawPath: '/etf/SPUS', rawQuery: 'url=example.com',
  })
  assert.deepEqual(parseIncoming('com.halaq.app://stock/AAPL?url=example.com'), {
    rawPath: 'stock/AAPL', rawQuery: 'url=example.com',
  })

  for (const bad of [
    'https://evil.com/stock/AAPL',
    'https://halaq.app.evil.com/stock/AAPL',
    'https://halaq.app@evil.com/stock/AAPL',
    'https://user@halaq.app/stock/AAPL',
    'https://halaq.app:8443/stock/AAPL',
    'http://halaq.app/stock/AAPL',
    'https://halaq.app/stock/AAPL#fragment',
    'https://halaq.app/stock/AAPL#',
    'javascript:alert(1)',
    null,
    42,
  ]) {
    assert.equal(parseIncoming(bad), null, `must reject ${String(bad)}`)
  }

  // Both URL families share the route allowlist and query-key validation.
  const code = mainJsx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  assert.match(code, /const parsed = parseIncoming\(raw\)/, 'openDeepLink must use the parser')
  assert.match(code, /knownRoute/, 'route allowlist must still be enforced')
  assert.match(code, /QUERY_KEYS/, 'query-key allowlist must still be enforced')
})
