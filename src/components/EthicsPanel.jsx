import { useEffect, useState } from 'react'
import { findListings, findParentListings, summarizeListings, loadBoycottData } from '../services/ethics'
import { findParents } from '../services/gleif'
import MaterialIcon from './MaterialIcon'
import './EthicsPanel.css'

/**
 * Looks the company up on the boycott lists. Returns null while the lists
 * load, then { summary, data }.
 */
export function useEthics({ name, ticker, aliases }) {
  const [state, setState] = useState(null)
  const aliasKey = (aliases || []).join('|')
  useEffect(() => {
    let live = true
    setState(null)
    if (!name && !ticker) return undefined
    loadBoycottData()
      .then(data => {
        if (!live) return
        const own = findListings(data, { name, ticker, aliases: aliasKey ? aliasKey.split('|') : [] })
        setState({ summary: summarizeListings(own), data, parents: null })
        // Then the parent companies GLEIF records, which can take a moment.
        if (!name) return
        findParents(name)
          .then(parents => {
            if (!live) return
            setState({ summary: summarizeListings([...own, ...findParentListings(data, parents)]), data, parents })
          })
          .catch(() => live && setState(prev => prev && { ...prev, parents: [] }))
      })
      .catch(() => live && setState({ summary: null, data: null, error: true }))
    return () => { live = false }
  }, [name, ticker, aliasKey])
  return state
}

export function ethicsHeadline(summary) {
  if (!summary) return 'Checking'
  if (!summary.listed) return 'Not listed'
  return summary.sourceCount === 1 ? 'On 1 list' : `On ${summary.sourceCount} lists`
}

/**
 * The humanitarian and country picture for a company, beside (never inside)
 * the Shariah verdict.
 */
export default function EthicsPanel({ name, ticker, country, aliases, ethics: given }) {
  const own = useEthics({ name, ticker, aliases })
  const ethics = given || own
  const isIsraeli = /^israel$/i.test(String(country || '').trim())

  if (!ethics) {
    return <div className="ethics ethics--loading" aria-busy="true">Checking the boycott lists…</div>
  }
  if (ethics.error) {
    return <div className="ethics">We couldn’t load the boycott lists. Try again in a moment.</div>
  }

  const { summary, data } = ethics
  const bySource = data.sources

  return (
    <div className="ethics">
      <div className={`ethics__headline ethics__headline--${summary.listed ? 'listed' : 'clear'}`}>
        <MaterialIcon name={summary.listed ? 'flag' : 'check_circle'} fill size={20} />
        <div>
          <strong>
            {summary.listed
              ? `${name} is on ${summary.sourceCount} of the ${Object.keys(bySource).length} lists we check`
              : `${name} isn’t on any of the lists we check`}
          </strong>
          <p>
            {summary.listed
              ? 'Each list is a campaign by that organisation. What follows is what they say, in brief, with a link to read it in full.'
              : 'That covers the company’s own name, its ticker, the brands the lists attribute to it, and its parent companies.'}
          </p>
        </div>
      </div>

      {summary.rows.length > 0 && (
        <ul className="ethics__rows">
          {summary.rows.map((row, i) => {
            const source = bySource[row.source]
            const href = row.source === 'bds' && /divest/i.test(row.type) ? source.divestmentUrl || source.url : source.url
            return (
              <li key={`${row.source}-${row.company}-${i}`} className="ethics__row">
                <div className="ethics__row-head">
                  <a href={href} target="_blank" rel="noopener noreferrer" className="ethics__source">
                    {source.name}
                    <MaterialIcon name="open_in_new" size={14} />
                  </a>
                  <span className="ethics__type">{row.type}</span>
                </div>
                <p className="ethics__reason">
                  {row.via === 'brand' && <span className="ethics__brand">{row.company}: </span>}
                  {row.via === 'parent' && <span className="ethics__brand">Parent company {row.parentCompany}: </span>}
                  {row.reason}
                </p>
                {row.topic && !/israel/i.test(row.topic) && <span className="ethics__topic">{row.topic}</span>}
              </li>
            )
          })}
        </ul>
      )}

      <dl className="ethics__country">
        <div>
          <dt>Headquarters</dt>
          <dd>{country || 'Not given'}</dd>
        </div>
        <div>
          <dt>Parent company</dt>
          <dd>
            {ethics.parents == null
              ? 'Checking…'
              : ethics.parents.length
                ? ethics.parents.map(p => p.name).join(', then ')
                : 'None reported'}
          </dd>
        </div>
      </dl>
      {isIsraeli && (
        <p className="ethics__note">
          The BDS movement asks people to boycott Israeli companies in general, unless a company has no part in the occupation and
          publicly supports Palestinian rights under international law.
        </p>
      )}

      <p className="ethics__foot">
        Lists checked on {formatDate(data.checked)}:{' '}
        {Object.values(bySource).map((s, i, all) => (
          <span key={s.name}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>
            {s.version ? ` (${s.version})` : ''}
            {i < all.length - 1 ? ', ' : '.'}
          </span>
        ))}{' '}
        Parent companies come from{' '}
        <a href="https://www.gleif.org/en/lei-data/global-lei-index" target="_blank" rel="noopener noreferrer">GLEIF</a>,
        where companies report them. A listing doesn’t change the Shariah verdict.
      </p>
    </div>
  )
}

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
