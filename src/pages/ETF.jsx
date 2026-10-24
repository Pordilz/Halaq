import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiUrl } from '../lib/apiBase'
import { screenStock, getMethodology } from '../services/complianceEngine'
import { DEDICATED_SHARIAH_FUND_TICKERS, getDedicatedShariahFund } from '../services/shariahFunds'
import ComplianceBadge from '../components/ComplianceBadge'
import FeatureGate from '../components/FeatureGate'
import MaterialIcon from '../components/MaterialIcon'
import useDocumentTitle from '../hooks/useDocumentTitle'
import './ETF.css'

const BUCKETS = [
  { status: 'COMPLIANT', label: 'Compliant' },
  { status: 'NON_COMPLIANT', label: 'Non-compliant' },
  { status: 'REVIEW_REQUIRED', label: 'Needs review' },
  { status: 'UNVERIFIED', label: 'Unverified' },
  { status: null, label: "Couldn't screen" },
]

const pct = value => `${(value * 100).toFixed(1)}%`

async function fetchFund(ticker, signal) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(apiUrl(`/api/etf/${encodeURIComponent(ticker)}`), {
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    signal,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(body.error || `Request failed (${res.status})`), {
      status: res.status,
      code: body.code || null,
    })
  }
  return body
}

export default function ETF() {
  const { ticker: routeTicker } = useParams()
  const ticker = routeTicker?.toUpperCase() || null
  const navigate = useNavigate()
  const { isPro, profile } = useAuth()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState({ loading: false, error: null, data: null })

  useDocumentTitle(ticker ? `${ticker} ETF X-Ray` : 'ETF X-Ray', 'See the Shariah compliance of the holdings in an ETF.')

  useEffect(() => {
    if (!isPro || !ticker) return undefined
    const controller = new AbortController()
    setResult({ loading: true, error: null, data: null })
    fetchFund(ticker, controller.signal)
      .then(data => setResult({ loading: false, error: null, data }))
      .catch(error => {
        if (error.name !== 'AbortError') setResult({ loading: false, error, data: null })
      })
    return () => controller.abort()
  }, [ticker, isPro])

  const methodologyKey = profile?.methodology
  const methodology = getMethodology(methodologyKey)

  const holdings = useMemo(() => {
    if (!result.data) return []
    return result.data.holdings.map(h => ({
      ...h,
      status: h.data
        ? screenStock(h.data.profile, h.data.balanceSheet, h.data.income, { methodology: methodologyKey }).status
        : null,
    }))
  }, [result.data, methodologyKey])

  if (!isPro || result.error?.code === 'UPGRADE_REQUIRED') {
    return (
      <FeatureGate
        icon="donut_large"
        badge="Pro feature"
        title="ETF X-Ray"
        body="See how much of a fund's top holdings pass your Shariah methodology, and spot dedicated Shariah funds at a glance."
        features={[
          'Top holdings screened under your methodology',
          'Weighted compliance breakdown',
          'Dedicated Shariah fund badges',
        ]}
        action={{ label: 'Upgrade to Pro', onClick: () => navigate('/upgrade?tier=pro') }}
      />
    )
  }

  function submit(e) {
    e.preventDefault()
    const t = query.trim().toUpperCase()
    if (t) navigate(`/etf/${encodeURIComponent(t)}`)
  }

  const search = (
    <form className="etf-search" onSubmit={submit} role="search">
      <label htmlFor="etf-ticker" className="sr-only">Fund ticker</label>
      <MaterialIcon name="search" size={20} />
      <input
        id="etf-ticker"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Fund ticker, e.g. SPUS or QQQ"
        autoCapitalize="characters"
        autoComplete="off"
      />
      <button type="submit" className="btn btn-primary btn--sm">X-Ray</button>
    </form>
  )

  if (!ticker) {
    return (
      <div className="etf-page container animate-entrance">
        <header className="etf-header">
          <h1 className="text-h1">ETF X-Ray</h1>
          <p className="text-on-surface-variant">
            Screen a fund's top holdings under {methodology.label}. Dedicated Shariah funds are badged.
          </p>
        </header>
        {search}
        <section className="etf-card">
          <h2 className="etf-card__title">Dedicated Shariah funds</h2>
          <div className="etf-chips">
            {DEDICATED_SHARIAH_FUND_TICKERS.map(t => (
              <Link key={t} to={`/etf/${t}`} className="etf-chip">
                {t}
                <span>{getDedicatedShariahFund(t).provider}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    )
  }

  if (result.loading || (!result.data && !result.error)) {
    return (
      <div className="etf-page container">
        <div className="etf-skel etf-skel--hero" />
        <p className="etf-loading text-on-surface-variant">Screening {ticker}'s top holdings…</p>
        <div className="etf-skel etf-skel--table" />
      </div>
    )
  }

  if (result.error) {
    const { status, code, message } = result.error
    return (
      <div className="etf-page container">
        {search}
        <div className="etf-card etf-error">
          <MaterialIcon name="error_outline" size={40} className="text-error" />
          <h2 className="text-h2">{status === 404 ? `We couldn't find ${ticker}` : `We couldn't X-ray ${ticker}`}</h2>
          <p className="text-on-surface-variant">{message}</p>
          {code === 'NOT_A_FUND' && (
            <Link className="btn btn-primary" to={`/stock/${ticker}`}>Screen {ticker} as a stock</Link>
          )}
          {status >= 500 && (
            <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button>
          )}
        </div>
      </div>
    )
  }

  const { fund, unscreenable, coverage } = result.data
  const dedicated = fund.dedicated
  const screenedWeight = holdings.reduce((sum, h) => sum + h.weight, 0)
  const mix = BUCKETS
    .map(b => ({ ...b, weight: holdings.filter(h => h.status === b.status).reduce((sum, h) => sum + h.weight, 0) }))
    .filter(b => b.weight > 0)

  return (
    <div className="etf-page container animate-entrance">
      {search}

      <header className="etf-fund">
        <div>
          <p className="etf-fund__ticker">{fund.ticker}</p>
          <h1 className="text-h2">{fund.name}</h1>
          <p className="text-on-surface-variant">
            {[fund.family, fund.category].filter(Boolean).join(' · ')}
          </p>
        </div>
        {dedicated && (
          <span className="etf-fund__badge">
            <MaterialIcon name="verified" size={16} fill />
            Dedicated Shariah fund · {dedicated.provider}
          </span>
        )}
      </header>

      <section className="etf-card etf-note">
        <MaterialIcon name="info" size={18} />
        <p>
          {dedicated?.kind === 'sukuk' &&
            'This fund holds sukuk (Islamic bonds), not shares, so the stock screen doesn\'t apply to its holdings. Its compliance rests on the issuer\'s Shariah board.'}
          {dedicated?.kind === 'reit' &&
            `This fund holds REITs, whose compliance depends on tenants and lease structures. ${dedicated.provider} screens them to a Shariah methodology; the verdicts below are a cross-check only.`}
          {dedicated?.kind === 'equity' &&
            `${dedicated.provider} builds this fund to a published Shariah methodology and screens every holding. This X-ray re-checks the top holdings under ${methodology.label}; index and Halaq verdicts can differ at the margins.`}
          {!dedicated &&
            'This isn\'t a dedicated Shariah fund. A conventional fund that holds non-compliant companies is generally not considered Shariah-compliant as a whole, even if most of its holdings pass. Consider a dedicated Shariah fund instead.'}
        </p>
      </section>

      {holdings.length > 0 && dedicated?.kind !== 'sukuk' && (
        <section className="etf-card">
          <h2 className="etf-card__title">
            Top {holdings.length} holdings · {pct(coverage)} of the fund
          </h2>
          <div className="etf-mix" role="img" aria-label={mix.map(m => `${m.label} ${pct(m.weight / screenedWeight)}`).join(', ')}>
            {mix.map(m => (
              <span
                key={m.label}
                className={`etf-mix__seg etf-mix__seg--${(m.status || 'none').toLowerCase()}`}
                style={{ width: `${(m.weight / screenedWeight) * 100}%` }}
              />
            ))}
          </div>
          <ul className="etf-legend">
            {mix.map(m => (
              <li key={m.label}>
                <span className={`etf-legend__dot etf-mix__seg--${(m.status || 'none').toLowerCase()}`} />
                {m.label} <strong>{pct(m.weight / screenedWeight)}</strong>
              </li>
            ))}
          </ul>
          <p className="etf-card__foot text-on-surface-variant">
            Share of the top-holding weight, screened under {methodology.label}. The remaining{' '}
            {pct(Math.max(0, 1 - coverage))} of the fund isn't listed by our data provider.
          </p>

          <table className="etf-table">
            <thead>
              <tr>
                <th scope="col">Holding</th>
                <th scope="col" className="etf-table__num">Weight</th>
                <th scope="col">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => (
                <tr key={h.symbol}>
                  <td>
                    <Link to={`/stock/${h.symbol}`} className="etf-table__holding">
                      <strong>{h.symbol}</strong>
                      <span>{h.name}</span>
                    </Link>
                  </td>
                  <td className="etf-table__num">{pct(h.weight)}</td>
                  <td>
                    {h.status
                      ? <ComplianceBadge status={h.status} />
                      : <span className="etf-table__error" title={h.error}>Couldn't screen</span>}
                  </td>
                </tr>
              ))}
              {unscreenable.map(u => (
                <tr key={u.name}>
                  <td><span className="etf-table__holding"><span>{u.name}</span></span></td>
                  <td className="etf-table__num">{pct(u.weight)}</td>
                  <td><span className="etf-table__error">Not a listed share</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {holdings.length === 0 && dedicated?.kind !== 'sukuk' && (
        <section className="etf-card">
          <p className="text-on-surface-variant">
            Our data provider doesn't list holdings for {fund.ticker}, so there's nothing to screen.
          </p>
        </section>
      )}
    </div>
  )
}
