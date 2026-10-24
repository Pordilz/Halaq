import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { useWatchlist } from '../hooks/useWatchlist'
import { useAutoScreen } from '../hooks/useAutoScreen'
import { verdictLabel } from '../lib/verdictLabels'
import { supabase } from '../lib/supabase'
import { apiUrl } from '../lib/apiBase'
import MaterialIcon from '../components/MaterialIcon'
import StockRowCard from '../components/StockRowCard'
import useDocumentTitle from '../hooks/useDocumentTitle'
import './Watchlist.css'

export default function Watchlist() {
  const { user, isPro, profile } = useAuth()
  const navigate = useNavigate()
  const { watchlist, loading, removeFromWatchlist, updateStatus, applyVerification, dismissChange } = useWatchlist(user)

  // Track which tickers have an in-flight Verify request so the row can
  // show "Verifying…" and disable repeat clicks. Also collect any error
  // (e.g. rate limit hit) so we can show it inline on that row.
  const [verifyingTickers, setVerifyingTickers] = useState(() => new Set())
  const [verifyError, setVerifyError] = useState(null)

  useDocumentTitle('Watchlist', 'Your saved Shariah-screened stocks.')

  const navigateToStock = (ticker) => navigate(`/stock/${ticker}`)

  async function handleVerify(ticker) {
    if (!user || verifyingTickers.has(ticker)) return
    setVerifyError(null)
    setVerifyingTickers(prev => {
      const next = new Set(prev)
      next.add(ticker)
      return next
    })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setVerifyError({ ticker, message: 'Sign in expired — please log in again.' })
        return
      }
      const res = await fetch(apiUrl(`/api/verify-screen/${encodeURIComponent(ticker)}`), {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setVerifyError({ ticker, message: body?.error || `Verification failed (${res.status})` })
        return
      }
      // The server already persisted status + confidence + data_sources_used
      // + screened_at to Supabase. Mirror them into local state so the UI
      // updates without waiting for a refetch.
      if (body?.status) applyVerification(ticker, body)
    } catch (err) {
      setVerifyError({ ticker, message: err?.message || 'Network error during verification.' })
    } finally {
      setVerifyingTickers(prev => {
        const next = new Set(prev)
        next.delete(ticker)
        return next
      })
    }
  }

  // New rows get a verdict automatically and saved ones are refreshed daily;
  // changed verdicts surface below as alerts.
  useAutoScreen(watchlist, updateStatus, isPro ? profile?.methodology : undefined)

  // Verdict changes in the last 30 days (migration 009), newest first.
  const recentChanges = watchlist
    .filter(s => s.previousStatus && s.statusChangedAt &&
      Date.now() - Date.parse(s.statusChangedAt) < 30 * 24 * 60 * 60 * 1000)
    .sort((a, b) => Date.parse(b.statusChangedAt) - Date.parse(a.statusChangedAt))

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
      <div className="container status-screen">
        <MaterialIcon name="lock" size={48} className="text-outline-variant" />
        <h2 className="text-h2">Sign in to save stocks</h2>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
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
            <div className="watchlist-loading" role="status" aria-label="Loading your watchlist">
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

              {recentChanges.length > 0 && (
                <div className="card-standard watchlist-changes-card mobile-only">
                  <RecentChanges changes={recentChanges} onOpen={navigateToStock} onDismiss={dismissChange} />
                </div>
              )}

              <div className="watchlist-list">
                {watchlist.map(stock => (
                  <div key={stock.ticker}>
                    <StockRowCard
                      {...stock}
                      changedFrom={recentChanges.includes(stock) ? stock.previousStatus : null}
                      // Watchlist genuinely auto-screens null-status rows, so
                      // show the "Checking…" spinner. Other pages (Screener
                      // search) pass screening={false} so they get the
                      // "Tap to screen" affordance instead.
                      screening={!stock.status}
                      verifying={verifyingTickers.has(stock.ticker)}
                      onVerify={() => handleVerify(stock.ticker)}
                      inWatchlist={true}
                      onToggleWatchlist={() => removeFromWatchlist(stock.ticker)}
                      onClick={() => navigateToStock(stock.ticker)}
                    />
                    {verifyError?.ticker === stock.ticker && (
                      <div className="watchlist-verify-error" role="alert">
                        <MaterialIcon name="error" size={14} />
                        {verifyError.message}
                      </div>
                    )}
                  </div>
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
            <RecentChanges changes={recentChanges} onOpen={navigateToStock} onDismiss={dismissChange} />
          </div>
        </div>
      </div>
    </div>
  )
}

function RecentChanges({ changes, onOpen, onDismiss }) {
  return (
    <section aria-labelledby="watchlist-changes-title">
      <h4 id="watchlist-changes-title" className="text-label mb-4 flex-row gap-2">
        <MaterialIcon name="notifications" size={18} />
        Recent verdict changes
      </h4>
      {changes.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">
          No verdict changes in your watchlist in the last 30 days.
        </p>
      ) : (
        <ul className="watchlist-changes">
          {changes.map(s => (
            <li key={s.ticker} className="watchlist-change">
              <button type="button" className="watchlist-change__open" onClick={() => onOpen(s.ticker)}>
                <strong>{s.ticker}</strong>
                <span>{verdictLabel(s.previousStatus)} → {verdictLabel(s.status)}</span>
                <time dateTime={s.statusChangedAt}>
                  {new Date(s.statusChangedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </time>
              </button>
              <button
                type="button"
                className="watchlist-change__dismiss focus-ghost"
                aria-label={`Dismiss the ${s.ticker} change`}
                onClick={() => onDismiss(s.ticker)}
              >
                <MaterialIcon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="watchlist-changes__foot">
        Verdicts are re-checked daily. They change when a company reports new financials, its
        share price moves the ratios, or a screening methodology is updated.
      </p>
    </section>
  )
}
