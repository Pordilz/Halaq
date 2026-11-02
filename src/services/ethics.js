/**
 * Ethics check: is a company on the boycott and accountability lists Halaq
 * reads (BDS, Boycott Israel, Ethical Consumer, and the UN database of
 * businesses involved in Israeli settlements)?
 *
 * This sits beside the Shariah verdict and never changes it: a listing
 * reflects that organisation's campaign, and the user decides what to do
 * with it.
 *
 * The lists live in src/content/boycotts.json, compiled from the sources on
 * the date in its `checked` field.
 */

export const SOURCE_ORDER = ['bds', 'boycottIsrael', 'ethicalConsumer', 'unSettlements']

const LEGAL_SUFFIXES = new Set([
  'inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'ltd', 'limited', 'plc', 'llc', 'lp',
  'sa', 'ag', 'nv', 'se', 'spa', 'ab', 'asa', 'as', 'oyj', 'bv', 'gmbh', 'kk', 'tbk', 'bhd', 'berhad',
  'holdings', 'holding', 'group', 'the', 'adr', 'class', 'a', 'b',
])

/** "The Coca-Cola Company" → "coca cola"; "Nestlé S.A." → "nestle". */
export function normalizeCompanyName(name) {
  const words = String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b([a-z])\.(?=[a-z]\.)/g, '$1') // S.A. → SA
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  while (words.length > 1 && LEGAL_SUFFIXES.has(words.at(-1))) words.pop()
  while (words.length > 1 && words[0] === 'the') words.shift()
  return words.join(' ')
}

const baseTicker = t => String(t || '').trim().toUpperCase()

let indexCache = null

function buildIndex(data) {
  if (indexCache?.data === data) return indexCache
  const byName = new Map()
  const byParent = new Map()
  const byTicker = new Map()
  const add = (map, key, entry) => {
    if (!key) return
    if (!map.has(key)) map.set(key, [])
    if (!map.get(key).includes(entry)) map.get(key).push(entry)
  }
  for (const entry of data.companies) {
    for (const n of [entry.name, ...(entry.aliases || [])]) add(byName, normalizeCompanyName(n), entry)
    if (entry.parent) add(byParent, normalizeCompanyName(entry.parent), entry)
    // A brand's ticker is its parent's: matching it means "a brand of this company".
    for (const t of entry.tickers || []) add(byTicker, baseTicker(t), entry)
  }
  indexCache = { data, byName, byParent, byTicker }
  return indexCache
}

/**
 * Entries that refer to this company, each tagged with how it matched:
 *   'company' — the company itself is listed
 *   'brand'   — one of its brands or subsidiaries is listed
 */
export function findListings(data, { name, ticker, aliases = [] } = {}) {
  if (!data?.companies) return []
  const { byName, byParent, byTicker } = buildIndex(data)
  const found = new Map()
  const keep = (entry, via) => {
    // A direct match outranks a brand match for the same entry.
    if (!found.has(entry) || via === 'company') found.set(entry, via)
  }

  const names = [name, ...aliases].map(normalizeCompanyName).filter(n => n.length >= 2)
  for (const n of names) {
    for (const e of byName.get(n) || []) keep(e, 'company')
    for (const e of byParent.get(n) || []) keep(e, 'brand')
  }
  const t = baseTicker(ticker)
  if (t) {
    for (const e of byTicker.get(t) || []) keep(e, e.parent ? 'brand' : 'company')
  }

  return [...found.entries()].map(([entry, via]) => ({ ...entry, via }))
}

/**
 * The summary the page shows: which lists name the company (directly or
 * through a brand), and every listing in source order.
 */
export function summarizeListings(matches) {
  const sources = new Set()
  const rows = []
  for (const m of matches) {
    for (const l of m.listings) {
      sources.add(l.source)
      rows.push({ ...l, company: m.name, via: m.via, parent: m.parent || null })
    }
  }
  rows.sort((a, b) => SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source))
  return {
    listed: rows.length > 0,
    sourceCount: sources.size,
    sources: SOURCE_ORDER.filter(s => sources.has(s)),
    rows,
  }
}

let dataPromise = null

/** Loads the lists on demand, so pages that don't need them stay small. */
export function loadBoycottData() {
  dataPromise ||= import('../content/boycotts.json').then(m => m.default || m)
  return dataPromise
}
