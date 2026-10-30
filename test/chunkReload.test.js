import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isChunkLoadError, reloadForNewBuild } from '../src/lib/chunkReload.js'

const memoryStorage = () => {
  const m = new Map()
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }
}

test('recognises chunk-load failures from Chrome, Firefox and Safari', () => {
  assert.ok(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://halaq.vercel.app/assets/Screener-abc.js')))
  assert.ok(isChunkLoadError(new TypeError('error loading dynamically imported module')))
  assert.ok(isChunkLoadError(new TypeError('Importing a module script failed.')))
  assert.ok(isChunkLoadError('Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html". Strict MIME type checking is enforced for module scripts per HTML spec. not a valid JavaScript MIME type'))
  assert.equal(isChunkLoadError(new Error('Cannot read properties of undefined')), false)
  assert.equal(isChunkLoadError(undefined), false)
})

test('reloads once, then lets the error surface instead of looping', () => {
  const storage = memoryStorage()
  let reloads = 0
  const reload = () => { reloads++ }
  assert.equal(reloadForNewBuild({ storage, now: 1_000_000, reload }), true)
  assert.equal(reloadForNewBuild({ storage, now: 1_004_000, reload }), false)
  assert.equal(reloads, 1)
  // A later deploy in the same tab gets its own reload.
  assert.equal(reloadForNewBuild({ storage, now: 1_060_000, reload }), true)
  assert.equal(reloads, 2)
})

test('never auto-reloads when storage is blocked, so it cannot loop', () => {
  const blocked = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  let reloads = 0
  assert.equal(reloadForNewBuild({ storage: blocked, now: 1_000_000, reload: () => { reloads++ } }), false)
  assert.equal(reloadForNewBuild({ storage: null, now: 1_000_000, reload: () => { reloads++ } }), false)
  assert.equal(reloads, 0)
})
