import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(ROOT, 'supabase', 'migrations')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
assert.ok(files.length > 0, 'no SQL migrations found')

// Concatenate every migration: the hardening may live in one new file or be
// spread across several. Strip -- line comments to avoid false positives.
const sql = files
  .map((f) => readFileSync(path.join(dir, f), 'utf8').replace(/--[^\n]*/g, ''))
  .join('\n')

test('a migration enables RLS on portfolio_items', () => {
  assert.ok(
    /ALTER\s+TABLE\s+(?:public\.)?portfolio_items[\s\S]{0,200}?ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(sql) ||
      /ENABLE\s+ROW\s+LEVEL\s+SECURITY[\s\S]{0,200}?portfolio_items/i.test(sql),
    'a migration must enable row level security on public.portfolio_items',
  )
})

test('a migration revokes EXECUTE on touch_updated_at from public roles', () => {
  assert.match(
    sql,
    /REVOKE[\s\S]{0,200}?ON\s+FUNCTION[\s\S]{0,120}?touch_updated_at/i,
    'a migration must REVOKE EXECUTE on public.touch_updated_at()',
  )
})

test('a migration adds a UNIQUE index/constraint on stripe_subscription_id', () => {
  assert.ok(
    /UNIQUE[\s\S]{0,200}?stripe_subscription_id|stripe_subscription_id[\s\S]{0,200}?UNIQUE/i.test(sql),
    'a migration must add a UNIQUE index on profiles.stripe_subscription_id',
  )
})
