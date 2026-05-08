import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWatchlist } from '../hooks/useWatchlist'
import MaterialIcon from '../components/MaterialIcon'
import StockRowCard from '../components/StockRowCard'
import useDocumentTitle from '../hooks/useDocumentTitle'
import './Watchlist.css'

export default function Watchlist() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { watchlist, loading, removeFromWatchlist } = useWatchlist(user)

  useDocumentTitle('Watchlist', 'Your saved Shariah-screened stocks.')

  const navigateToStock = (ticker) => navigate(`/stock/${ticker}`)

  // Match Home's definition: a watchlist row that hasn't been screened yet
  // (status === null) counts as "doubtful" until proven otherwise. Without
  // this, Home and Watchlist totals would disagree for the same data.
  const breakdown = {
    compliant: watchlist.filter(s => s.status === 'COMPLIANT').length,
    doubtful: watchlist.filter(s => s.status === 'DOUBTFUL' || !s.status).length,
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
                      {breakdown.doubtful} Doubtful
                    </span>
                    <span className="stat-legend__item">
                      <span className="stat-legend__dot bg-error" />
                      {breakdown.nonCompliant} Non-compliant
                    </span>
                  </div>
                </div>
                {total > 0 && (breakdown.compliant + breakdown.doubtful + breakdown.nonCompliant) > 0 && (
                  <div className="stacked-bar">
                    <div style={{ width: `${(breakdown.compliant / total) * 100}%` }} className="bg-tertiary" />
                    <div style={{ width: `${(breakdown.doubtful / total) * 100}%` }} className="bg-caution" />
                    <div style={{ width: `${(breakdown.nonCompliant / total) * 100}%` }} className="bg-error" />
                  </div>
                )}
              </div>

              <div className="watchlist-list">
                {watchlist.map(stock => (
                  <StockRowCard
                    key={stock.ticker}
                    {...stock}
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
