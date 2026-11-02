import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { findParents, tidyLegalName } from '../src/services/gleif.js'
import { findParentListings, summarizeListings } from '../src/services/ethics.js'

const data = JSON.parse(readFileSync(new URL('../src/content/boycotts.json', import.meta.url)))

function fakeGleif(routes) {
  return async url => {
    const path = String(url).replace('https://api.gleif.org/api/v1', '')
    const body = routes[path]
    return body ? new Response(JSON.stringify(body), { status: 200 }) : new Response('{}', { status: 404 })
  }
}

const record = (id, name) => ({ data: { id, attributes: { entity: { legalName: { name } } } } })

test('a subsidiary’s parent comes back from GLEIF', async () => {
  const fetchImpl = fakeGleif({
    '/autocompletions?field=fulltext&q=Hindustan%20Unilever%20Limited': {
      data: [{ attributes: { value: 'HINDUSTAN UNILEVER LIMITED' }, relationships: { 'lei-records': { data: { id: 'HUL' } } } }],
    },
    '/lei-records/HUL/direct-parent': record('UL', 'UNILEVER PLC'),
    '/lei-records/HUL/ultimate-parent': record('UL', 'UNILEVER PLC'),
  })
  const parents = await findParents('Hindustan Unilever Limited', { fetchImpl, cache: false })
  assert.deepEqual(parents, [{ name: 'Unilever PLC', lei: 'UL', relation: 'direct' }])
})

test('no exact name match means no parent, not a guess', async () => {
  const fetchImpl = fakeGleif({
    '/autocompletions?field=fulltext&q=Audi%20AG': { data: [{ attributes: { value: 'Audi Stiftung für Umwelt GmbH' }, relationships: { 'lei-records': { data: { id: 'X' } } } }] },
  })
  assert.deepEqual(await findParents('Audi AG', { fetchImpl, cache: false }), [])
})

test('a parent on a list flags the subsidiary, marked as through its parent', () => {
  const rows = summarizeListings(findParentListings(data, [{ name: 'Unilever PLC' }])).rows
  assert.ok(rows.length > 0)
  assert.ok(rows.every(r => r.via === 'parent' && r.parentCompany === 'Unilever PLC'))
})

test('legal names in capitals are tidied for display', () => {
  assert.equal(tidyLegalName('UNILEVER PLC'), 'Unilever PLC')
  assert.equal(tidyLegalName('Nestlé S.A.'), 'Nestlé S.A.')
})
