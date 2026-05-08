import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWatchlist } from '../hooks/useWatchlist'
import MaterialIcon from '../components/MaterialIcon'
import ComplianceBadge from '../components/ComplianceBadge'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { getCurrencySymbol } from '../services/complianceEngine'
import { displayFirstToken } from '../lib/username'
import './Home.css'

const formatPrice = (price, currency) => {
  if (!Number.isFinite(price) || price === 0) return null
  return `${getCurrencySymbol(currency)}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatChange = (pct) => {
  if (!Number.isFinite(pct)) return null
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

export default function Home() {
  const navigate = useNavigate()
  const { user, profile, tier, isPro } = useAuth()
  const { watchlist, loading: wlLoading } = useWatchlist(user)

  useDocumentTitle('Home', 'Your halal investing dashboard.')

  const [quotes, setQuotes] = useState({})
  const [quotesLoading, setQuotesLoading] = useState(false)
  // 'ok' | 'partial' | 'failed' | null. Drives a banner when Yahoo is
  // throttling us so users don't think the page is stuck.
  const [quotesHealth, setQuotesHealth] = useState(null)

  const tickers = useMemo(() => watchlist.map(w => w.ticker), [watchlist])
  const QUOTE_LIMIT = 16
  const tickersOverLimit = Math.max(0, tickers.length - QUOTE_LIMIT)

  // Fetch live quotes for the watchlist
  const fetchQuotes = useCallback(async (signal) => {
    if (tickers.length === 0) {
      setQuotes({})
      setQuotesHealth(null)
      return
    }
    setQuotesLoading(true)
    const subset = tickers.slice(0, QUOTE_LIMIT)
    const results = await Promise.allSettled(
      subset.map(t =>
        fetch(`/api/quote/${encodeURIComponent(t)}`, { signal })
          .then(r => (r.ok ? r.json() : null))
      )
    )
    if (signal?.aborted) return
    const map = {}
    let okCount = 0
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        map[subset[i]] = r.value
        okCount += 1
      }
    })
    setQuotes(map)
    if (subset.length > 0) {
      const ratio = okCount / subset.length
      setQuotesHealth(ratio === 1 ? 'ok' : ratio === 0 ? 'failed' : 'partial')
    }
    setQuotesLoading(false)
  }, [tickers])

  useEffect(() => {
    const controller = new AbortController()
    fetchQuotes(controller.signal)
    return () => controller.abort()
  }, [fetchQuotes])

  // Auto refresh every 60s while tab is visible
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) fetchQuotes()
    }, 60_000)
    return () => clearInterval(id)
  }, [fetchQuotes])

  const breakdown = useMemo(() => ({
    total: watchlist.length,
    compliant: watchlist.filter(w => w.status === 'COMPLIANT').length,
    doubtful: watchlist.filter(w => w.status === 'DOUBTFUL' || !w.status).length,
    nonCompliant: watchlist.filter(w => w.status === 'NON_COMPLIANT').length,
  }), [watchlist])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const firstName = displayFirstToken(profile, user)

  return (
    <div className="home-page container animate-entrance">
      <header className="home-hero">
        <span className="home-hero__eyebrow">{greeting}</span>
        <h1 className="home-hero__title">{firstName}, here's your portfolio.</h1>
        <p className="home-hero__sub">
          Live prices update every minute. Compliance status follows the {profile?.methodology || 'AAOIFI'} methodology.
        </p>
        <div className="home-hero__actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/screener')}>
            <MaterialIcon name="search" size={18} /> Screen a stock
          </button>
          <Link to="/learn" className="btn btn-ghost">
            <MaterialIcon name="school" size={18} /> Learn the method
          </Link>
        </div>
      </header>

      <section className="home-stats" aria-label="Watchlist breakdown">
        <Stat label="Saved stocks" value={breakdown.total} icon="bookmarks" />
        <Stat label="Compliant" value={breakdown.compliant} tone="tertiary" icon="check_circle" />
        <Stat label="Needs review" value={breakdown.doubtful} tone="caution" icon="help" />
        <Stat label="Non-compliant" value={breakdown.nonCompliant} tone="error" icon="cancel" />
      </section>

      <section className="home-section">
        <header className="home-section__header">
          <div>
            <h2 className="home-section__title">Watchlist · live prices</h2>
            <p className="home-section__sub">
              {watchlist.length === 0
                ? 'Save a stock to see live prices here.'
                : 'Tap a card for the full compliance report.'}
            </p>
          </div>
          {watchlist.length > 0 && (
            <Link to="/watchlist" className="home-section__link">
              See all <MaterialIcon name="arrow_forward" size={16} />
            </Link>
          )}
        </header>

        {(quotesHealth === 'partial' || quotesHealth === 'failed' || tickersOverLimit > 0) && watchlist.length > 0 && (
          <div className="home-quote-status" role="status">
            <MaterialIcon name="info" size={16} />
            <span>
              {quotesHealth === 'failed'
                ? 'Live prices unavailable — Yahoo Finance is rate-limiting us. Try again in a minute.'
                : quotesHealth === 'partial'
                  ? "Some live prices couldn't load — Yahoo is throttling us, will retry shortly."
                  : `Showing live prices for the first ${QUOTE_LIMIT} of ${watchlist.length} watchlist stocks.`}
            </span>
          </div>
        )}

        {wlLoading ? (
          <div className="home-grid">
            {[0, 1, 2, 3].map(i => <WatchTileSkeleton key={i} />)}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="home-empty">
            <MaterialIcon name="bookmark_add" size={36} className="text-secondary" />
            <h3>Your watchlist is empty</h3>
            <p>Use the screener to find a stock, then bookmark it. It'll show up here with live prices.</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/screener')}>Open screener</button>
          </div>
        ) : (
          <div className="home-grid">
            {watchlist.slice(0, 8).map(stock => (
              <WatchTile
                key={stock.ticker}
                stock={stock}
                quote={quotes[stock.ticker]}
                onClick={() => navigate(`/stock/${stock.ticker}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <header className="home-section__header">
          <div>
            <h2 className="home-section__title">Plan</h2>
            <p className="home-section__sub">You're on the {tier.toUpperCase()} plan.</p>
          </div>
        </header>
        <div className="home-plan-card">
          <div>
            <div className="home-plan-card__title">
              <MaterialIcon name={isPro ? 'workspace_premium' : 'rocket_launch'} className="text-primary" size={22} />
              {isPro ? 'You\'re unlocked' : 'Upgrade for unlimited screens'}
            </div>
            <p className="home-plan-card__copy">
              {isPro
                ? 'Unlimited screens, batch tools, methodology switching and PDF reports.'
                : 'Free tier is capped at 5 screens per day. Pro unlocks unlimited and the full ratio breakdown.'}
            </p>
          </div>
          <button
            type="button"
            className={`btn ${isPro ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => navigate(isPro ? '/profile' : '/upgrade')}
          >
            {isPro ? 'Manage plan' : 'See plans'}
          </button>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, tone = 'neutral', icon }) {
  return (
    <div className={`home-stat home-stat--${tone}`}>
      <div className="home-stat__icon">
        <MaterialIcon name={icon} size={18} />
      </div>
      <div className="home-stat__value">{value}</div>
      <div className="home-stat__label">{label}</div>
    </div>
  )
}

function WatchTileSkeleton() {
  return (
    <div className="home-tile">
      <div className="skeleton-block" style={{ width: '3rem', height: '1.5rem' }} />
      <div className="skeleton-block" style={{ width: '70%', height: '1rem', marginTop: '0.75rem' }} />
      <div className="skeleton-block" style={{ width: '40%', height: '1.75rem', marginTop: '0.75rem' }} />
    </div>
  )
}

function WatchTile({ stock, quote, onClick }) {
  const price = quote?.regularMarketPrice
  const change = quote?.regularMarketChangePercent
  const currency = quote?.currency || 'USD'
  const formattedPrice = formatPrice(price, currency)
  const formattedChange = formatChange(change)
  const positive = Number.isFinite(change) ? change >= 0 : null

  return (
    <button type="button" className="home-tile" onClick={onClick}>
      <div className="home-tile__top">
        <span className="home-tile__ticker">{stock.ticker}</span>
        {stock.status && <ComplianceBadge status={stock.status} size="sm" />}
      </div>
      <div className="home-tile__name">{stock.name || stock.ticker}</div>
      <div className="home-tile__price-row">
        <span className="home-tile__price">{formattedPrice || '—'}</span>
        {formattedChange && (
          <span className={`home-tile__change ${positive ? 'home-tile__change--up' : 'home-tile__change--down'}`}>
            <MaterialIcon name={positive ? 'trending_up' : 'trending_down'} size={14} />
            {formattedChange}
          </span>
        )}
      </div>
      {stock.exchange && <span className="home-tile__exchange">{stock.exchange}</span>}
    </button>
  )
}
