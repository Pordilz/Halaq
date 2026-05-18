import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWatchlist } from '../hooks/useWatchlist'
import { fetchAllScreeningData } from '../services/yahooFinanceApi'
import { screenStock } from '../services/complianceEngine'
import MaterialIcon from '../components/MaterialIcon'
import StockRowCard from '../components/StockRowCard'
import useDocumentTitle from '../hooks/useDocumentTitle'
import './Watchlist.css'

export default function Watchlist() {
  const { user, isPro, profile } = useAuth()
  const navigate = useNavigate()
  const { watchlist, loading, removeFromWatchlist, updateStatus } = useWatchlist(user)

  useDocumentTitle('Watchlist', 'Your saved Shariah-screened stocks.')

  const navigateToStock = (ticker) => navigate(`/stock/${ticker}`)

  // Auto-screen any watchlist entry that lacks a status. This is what the
  // user expected — adding to watchlist should produce a compliance verdict
  // automatically, not leave a "Screen →" CTA. We process unstatused tickers
  // sequentially with a small delay to avoid hammering Yahoo, and bail out
  // cleanly if the component unmounts mid-flight.
  const screenedRef = useRef(new Set())
  useEffect(() => {
    let cancelled = false
    const methodology = isPro ? profile?.methodology : undefined
    const pending = watchlist
      .filter(s => !s.status && !screenedRef.current.has(s.ticker))
      .slice(0, 8) // cap so a 100-stock watchlist doesn't fire 100 fetches at once
    if (pending.length === 0) return

    ;(async () => {
      for (const stock of pending) {
        if (cancelled) return
        screenedRef.current.add(stock.ticker)
        try {
          const data = await fetchAllScreeningData(stock.ticker)
          if (cancelled) return
          const compliance = screenStock(data.profile, data.balanceSheet, data.income, { methodology })
          updateStatus(stock.ticker, compliance.status)
        } catch {
          // Leave status null so the next visit retries — don't poison the
          // cache with a fake "needs review" just because Yahoo blipped.
          // The "Checking…" pill will reappear and try again next mount.
        }
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.length, isPro, profile?.methodology])

  // Status taxonomy after migration 007 splits the old DOUBTFUL bucket
  // into REVIEW_REQUIRED (genuine mixed-business judgement call) and
  // UNVERIFIED (data-gap, resolvable via the Verify flow). null status
  // means "screening in progress" — still rolls into unverified so the
  // count reflects everything that needs attention.
  const breakdown = {
    compliant: watchlist.filter(s => s.status === 'COMPLIANT').length,
    review: watchlist.filter(s => s.status === 'REVIEW_REQUIRED').length,
    unverified: watchlist.filter(s => s.status === 'UNVERIFIED' || s.status === 'DOUBTFUL' || !s.status).length,
    nonCompliant: watchlist.filter(s => s.status === 'NON_COMPLIANT').length,
  }
  const total = watchlist.length

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <MaterialIcon name="lock" size={48} className="text-outline-variant mb-4" />
        <h2 className="text-h2">Sign in to save stocks</h2>
        <button type="button" className="btn btn-primary mt-6 mx-auto" onClick={() => navigate('/login')}>
          Log in
        </button>
      </div>
    )
  }

  return (
    <div className="watchlist-page container animate-entrance">
      <div className="watchlist-header mb-6 mt-4">
        <h1 className="text-h1 mb-2">Watchlist</h1>
        <p className="text-on-surface-variant text-body-lg">
          Track the Shariah compliance of your favourite stocks.
        </p>
      </div>

      <div className="watchlist-layout">
        <div className="watchlist-main">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
              <MaterialIcon name="refresh" className="spinner text-primary" size={32} />
            </div>
          ) : total > 0 ? (
            <>
              <div className="summary-strip card-standard mb-6">
                <div className="summary-stats">
                  <div className="stat-box">
                    <span className="stat-value">{total}</span>
                    <span className="stat-label">Saved</span>
                  </div>
                  <div className="stat-divider" />
                  <div className="stat-legend">
                    <span className="stat-legend__item">
                      <span className="stat-legend__dot bg-tertiary" />
                      {breakdown.compliant} Compliant
                    </span>
                    <span className="stat-legend__item">
                      <span className="stat-legend__dot bg-caution" />
                      {breakdown.review} Review required
                    </span>
                    <span className="stat-legend__item">
                      <span className="stat-legend__dot bg-surface-container-highest" />
                      {breakdown.unverified} Unverified
                    </span>
                    <span className="stat-legend__item">
                      <span className="stat-legend__dot bg-error" />
                      {breakdown.nonCompliant} Non-compliant
                    </span>
                  </div>
                </div>
                {total > 0 && (breakdown.compliant + breakdown.review + breakdown.unverified + breakdown.nonCompliant) > 0 && (
                  <div className="stacked-bar">
                    <div style={{ width: `${(breakdown.compliant / total) * 100}%` }} className="bg-tertiary" />
                    <div style={{ width: `${(breakdown.review / total) * 100}%` }} className="bg-caution" />
                    <div style={{ width: `${(breakdown.unverified / total) * 100}%` }} className="bg-surface-container-highest" />
                    <div style={{ width: `${(breakdown.nonCompliant / total) * 100}%` }} className="bg-error" />
                  </div>
                )}
              </div>

              <div className="watchlist-list">
                {watchlist.map(stock => (
                  <StockRowCard
                    key={stock.ticker}
                    {...stock}
                    // Watchlist genuinely auto-screens null-status rows, so
                    // show the "Checking…" spinner. Other pages (Screener
                    // search) pass screening={false} so they get the
                    // "Tap to screen" affordance instead.
                    screening={!stock.status}
                    inWatchlist={true}
                    onToggleWatchlist={() => removeFromWatchlist(stock.ticker)}
                    onClick={() => navigateToStock(stock.ticker)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="card-standard empty-watchlist">
              <MaterialIcon name="bookmark_add" size={48} className="text-secondary opacity-60" />
              <h3 className="text-h3">Your watchlist is empty</h3>
              <p className="text-on-surface-variant max-w-sm">
                Find a stock in the screener and tap the bookmark icon to save it here.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => navigate('/screener')}>
                Go to screener
              </button>
            </div>
          )}
        </div>

        <div className="watchlist-sidebar desktop-only">
          <div className="card-standard p-6 sticky top-24">
            <h4 className="text-label mb-4 flex-row gap-2">
              <MaterialIcon name="notifications" size={18} />
              Recent alerts
            </h4>
            <div>
              <p className="text-body-sm text-on-surface-variant italic">
                No recent compliance changes in your watchlist.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
