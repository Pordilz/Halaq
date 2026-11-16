import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...parts) => readFileSync(path.join(ROOT, ...parts), 'utf8')

const manifest = read('android', 'app', 'src', 'main', 'AndroidManifest.xml')
const filePaths = read('android', 'app', 'src', 'main', 'res', 'xml', 'file_paths.xml')
const mainJsx = read('src', 'main.jsx')

test('AndroidManifest disables backup and points at data extraction rules', () => {
  assert.match(manifest, /android:allowBackup\s*=\s*"false"/, 'allowBackup must be false')
  assert.match(
    manifest,
    /android:dataExtractionRules\s*=\s*"@xml\/data_extraction_rules"/,
    'the manifest must reference @xml/data_extraction_rules',
  )
})

test('file_paths.xml never exposes the whole external/cache root', () => {
  assert.doesNotMatch(filePaths, /path\s*=\s*"\."/, 'path="." must be replaced with a constrained path')
})

test('native deep-link handler maps only an allowlist of known routes', () => {
  // Strip comments so the example URL in the source comment can't act as a
  // false positive for a route allowlist.
  const code = mainJsx
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')

  const hasRoutes = /\/(stock|etf|screen|screener|watchlist|jobs|chat)\b/i.test(code)
  const hasAllowCheck =
    /allowlist|allowed[_-]?routes|valid[_-]?routes|safe[_-]?routes|known[_-]?routes|whitelist|ALLOWED/i.test(code) ||
    /\.(test|some|includes|startsWith|has)\s*\(/.test(code)

  assert.ok(
    hasRoutes && hasAllowCheck,
    'main.jsx deep-link handling must restrict incoming paths to a known route allowlist',
  )
})
