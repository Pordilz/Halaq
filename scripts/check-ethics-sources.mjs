#!/usr/bin/env node
/**
 * Has any boycott or accountability list changed since src/content/boycotts.json
 * was last refreshed?
 *
 *   node scripts/check-ethics-sources.mjs            report changes (exit 0)
 *   node scripts/check-ethics-sources.mjs --update   record the lists as they are now
 *
 * None of the four lists has an API we may use commercially, so the app keeps
 * a hand-checked snapshot and this script watches the sources for changes:
 *   - BDS, Boycott Israel and Ethical Consumer: the entries on each page
 *     (headings and list items), compared with the last recorded set.
 *   - The UN settlements database: only the `last_change` date OpenSanctions
 *     publishes for its copy. That is metadata, not the list itself, whose
 *     licence doesn't allow commercial use.
 *
 * Run --update after refreshing boycotts.json, and commit both files.
 * The weekly GitHub workflow (.github/workflows/ethics-lists.yml) runs the
 * check and opens an issue listing what changed.
 */

import { readFile, writeFile, appendFile } from 'node:fs/promises'

const STATE = new URL('../src/content/boycotts.sources.json', import.meta.url)
const UA = 'Mozilla/5.0 (compatible; HalaqListWatch/1.0; +https://halaq.vercel.app)'

const decode = s =>
  s.replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|ldquo|rdquo);/gi, (m, c) => {
    if (c[0] === '#') return String.fromCodePoint(c[1].toLowerCase() === 'x' ? parseInt(c.slice(2), 16) : Number(c.slice(1)))
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' }[c.toLowerCase()]
  })

const clean = s => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

/**
 * Headings, list items and bold labels, plus the opening of each paragraph
 * (BDS describes each target in a paragraph that starts with its name).
 */
function pageEntries(html) {
  const body = html.replace(/<(script|style|noscript|svg|header|footer|nav)[\s\S]*?<\/\1>/gi, ' ')
  const items = [...body.matchAll(/<(li|h2|h3|h4|strong)[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => clean(m[2])).filter(t => t.length >= 2 && t.length <= 90)
  const openings = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => clean(m[1])).filter(t => t.length >= 40).map(t => `${t.slice(0, 70)}…`)
  return [...new Set([...items, ...openings])].sort()
}

const SOURCES = [
  { id: 'bds', name: 'BDS movement: what to boycott', url: 'https://bdsmovement.net/get-involved/what-to-boycott', read: pageEntries },
  { id: 'bdsDivestment', name: 'BDS movement: divestment targets', url: 'https://bdsmovement.net/Get-involved-divestment', read: pageEntries },
  {
    id: 'boycottIsrael',
    name: 'Boycott Israel list',
    url: 'https://boycott-israel.org/boycott.html',
    // Each company is a heading with its impact rating.
    read: html =>
      [...html.matchAll(/<h4>\s*([^<]{2,80}?)\s*<span class="label ([a-z ]+)">/g)].map(m => `${clean(m[1])} (${m[2].trim()})`).sort(),
  },
  { id: 'ethicalConsumer', name: 'Ethical Consumer boycotts list', url: 'https://www.ethicalconsumer.org/ethicalcampaigns/boycotts', read: pageEntries },
  {
    id: 'unSettlements',
    name: 'UN settlements database (OpenSanctions copy, change date only)',
    url: 'https://data.opensanctions.org/datasets/latest/ps_ohchr_settlement/index.json',
    read: text => {
      const d = JSON.parse(text)
      return [`last_change ${d.last_change}`, `entries ${d.target_count}`]
    },
  },
]

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/json' }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

const update = process.argv.includes('--update')
const before = JSON.parse(await readFile(STATE, 'utf8').catch(() => '{}'))
const after = { checked: new Date().toISOString().slice(0, 10), sources: {} }
const report = []

for (const source of SOURCES) {
  let entries
  try {
    entries = source.read(await fetchText(source.url))
  } catch (err) {
    report.push(`### ${source.name}\nCouldn’t check it (${err.message}). ${source.url}`)
    after.sources[source.id] = before.sources?.[source.id] || null
    continue
  }
  if (!entries.length) {
    report.push(`### ${source.name}\nThe page came back with no entries; its layout may have changed. ${source.url}`)
    after.sources[source.id] = before.sources?.[source.id] || null
    continue
  }
  after.sources[source.id] = entries
  const old = before.sources?.[source.id]
  if (!old) continue
  const added = entries.filter(e => !old.includes(e))
  const removed = old.filter(e => !entries.includes(e))
  if (added.length || removed.length) {
    const list = (label, xs) => (xs.length ? `\n**${label}:**\n${xs.slice(0, 40).map(x => `- ${x}`).join('\n')}${xs.length > 40 ? `\n- …and ${xs.length - 40} more` : ''}` : '')
    report.push(`### ${source.name}\n${source.url}${list('Added', added)}${list('Removed', removed)}`)
  }
}

if (update) {
  await writeFile(STATE, `${JSON.stringify(after, null, 2)}\n`)
  console.log(`Recorded ${Object.values(after.sources).filter(Boolean).length} sources as of ${after.checked}.`)
} else if (report.length) {
  const text = `The lists behind the ethics check have changed since ${before.checked || 'the last refresh'}.\n\nRefresh \`src/content/boycotts.json\` from the sources, then run \`node scripts/check-ethics-sources.mjs --update\` and commit both files.\n\n${report.join('\n\n')}\n`
  console.log(text)
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'changed=true\n')
  await writeFile(new URL('../ethics-sources-report.md', import.meta.url), text)
} else {
  console.log('No changes in the ethics lists.')
}
