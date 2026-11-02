/**
 * Parent companies from GLEIF, the global register of legal entities
 * (api.gleif.org, open data under CC0, no key, and open to browsers).
 *
 * The ethics check uses it so a subsidiary is judged with its parent:
 * Hindustan Unilever is owned by Unilever PLC, which is on a boycott list
 * even though "Hindustan Unilever" isn't. Not every company reports a parent
 * to GLEIF, so a miss means "not reported", not "independent".
 */

import { normalizeCompanyName } from './ethics.js'

const API = 'https://api.gleif.org/api/v1'
const CACHE_PREFIX = 'halaq:gleif:'
const CACHE_DAYS = 7
const TIMEOUT_MS = 6000

/** "UNILEVER PLC" → "Unilever PLC"; names already in mixed case are kept. */
export function tidyLegalName(name) {
  const s = String(name || '').trim()
  if (s !== s.toUpperCase()) return s
  return s
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\b(Plc|Ag|Sa|Nv|Se|Spa|Ab|Asa|Llc|Lp|Inc|Ltd|Co|Kk|Bv|Gmbh)\b/g, w => (w === 'Gmbh' ? 'GmbH' : w.toUpperCase()))
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { at, value } = JSON.parse(raw)
    return Date.now() - at < CACHE_DAYS * 86400000 ? value : null
  } catch {
    return null
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), value }))
  } catch {
    // Storage blocked or full: the lookup just runs again next time.
  }
}

async function getJson(path, fetchImpl) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetchImpl(`${API}${path}`, { signal: controller.signal, headers: { Accept: 'application/vnd.api+json' } })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`GLEIF ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** The LEI whose legal name is this company's, or null. */
export async function findLei(name, { fetchImpl = fetch } = {}) {
  const want = normalizeCompanyName(name)
  if (!want) return null
  const data = await getJson(`/autocompletions?field=fulltext&q=${encodeURIComponent(name)}`, fetchImpl)
  const hit = (data?.data || []).find(d => normalizeCompanyName(d.attributes?.value) === want)
  const lei = hit?.relationships?.['lei-records']?.data?.id
  return lei ? { lei, legalName: hit.attributes.value } : null
}

/**
 * The company's direct and ultimate parents as GLEIF records them:
 * [{ name, lei, relation: 'direct' | 'ultimate' }], nearest first.
 */
export async function findParents(name, { fetchImpl = fetch, cache = true } = {}) {
  const key = normalizeCompanyName(name)
  if (!key) return []
  if (cache) {
    const hit = readCache(key)
    if (hit) return hit
  }
  const found = await findLei(name, { fetchImpl })
  let parents = []
  if (found) {
    const [direct, ultimate] = await Promise.all([
      getJson(`/lei-records/${found.lei}/direct-parent`, fetchImpl),
      getJson(`/lei-records/${found.lei}/ultimate-parent`, fetchImpl),
    ])
    for (const [record, relation] of [[direct, 'direct'], [ultimate, 'ultimate']]) {
      const d = record?.data
      const legal = d?.attributes?.entity?.legalName?.name
      if (!legal || d.id === found.lei || parents.some(p => p.lei === d.id)) continue
      parents.push({ name: tidyLegalName(legal), lei: d.id, relation })
    }
  }
  if (cache) writeCache(key, parents)
  return parents
}
