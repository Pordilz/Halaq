import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

test('package.json exposes the scripts CI and developers rely on', () => {
  for (const name of ['dev', 'test', 'build']) {
    assert.equal(typeof pkg.scripts[name], 'string', `${name} script is missing`)
    assert.ok(pkg.scripts[name].length > 0, `${name} script is empty`)
  }
  assert.match(pkg.scripts.test, /node\s+--test/)
  assert.match(pkg.scripts.build, /vite\s+build/)
})

test('package.json declares a sane Node engine range', () => {
  const range = pkg.engines && pkg.engines.node
  assert.equal(typeof range, 'string', 'engines.node must be set')

  const match = range.match(/^>=(\d+)\.(\d+)\.(\d+)(?:\s*<(\d+))?$/)
  assert.ok(match, `unexpected engines.node range: ${range}`)
  assert.ok(Number(match[1]) >= 20, 'Node lower bound is too old')
  if (match[4] !== undefined) {
    assert.ok(Number(match[4]) > Number(match[1]), 'upper bound must exceed lower bound')
  }

  assert.equal(pkg.type, 'module')
})
