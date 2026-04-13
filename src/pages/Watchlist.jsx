import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from '../components/MaterialIcon'
import StockRowCard from '../components/StockRowCard'
import './Watchlist.css'

export default function Watchlist() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  
  // Mock data for demo
  const [watchlist, setWatchlist] = useState([
    { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ', status: 'COMPLIANT', marketCap: '$2.8T' },
    { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', exchange: 'NASDAQ', status: 'DOUBTFUL', marketCap: '$600B' }
  ])

  useEffect(() => {
    // Simulate data fetch
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const removeFromWatchlist = (ticker) => {
    setWatchlist(watchlist.filter(s => s.ticker !== ticker))
  }

  const navigateToStock = (ticker) => {
    navigate(`/stock/${ticker}`)
  }

  const complianceBreakdown = {
    compliant: watchlist.filter(s => s.status === 'COMPLIANT').length,
    doubtful: watchlist.filter(s => s.status === 'DOUBTFUL').length,
    nonCompliant: watchlist.filter(s => s.status === 'NON_COMPLIANT').length,
  }
  
  const total = watchlist.length;

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <MaterialIcon name="lock" size={48} className="text-outline-variant mb-4" />
        <h2 className="text-h2">Sign in to save stocks</h2>
        <button className="btn btn-primary mt-6 mx-auto" onClick={() => navigate('/login')}>Log In</button>
      </div>
    )
  }

  return (
    <div className="watchlist-page container animate-entrance">
      <div className="watchlist-header mb-6 mt-4">
        <h1 className="text-h1 mb-2">Watchlist</h1>
        <p className="text-on-surface-variant text-body-lg">
          Track the Shariah compliance of your favorite stocks.
        </p>
      </div>

      <div className="watchlist-layout">
        <div className="watchlist-main">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-12">
               <MaterialIcon name="refresh" className="spinner text-primary" size={32} />
             </div>
          ) : total > 0 ? (
            <>
              {/* Summary Strip */}
              <div className="summary-strip card-standard mb-6">
                 <div className="summary-stats">
                    <div className="stat-box">
                      <div className="stat-value">{total}</div>
                      <div className="stat-label">Saved Stocks</div>
                    </div>
                    <div className="stat-divider" />
                    <div className="flex-row gap-4 flex-wrap">
                       <span className="flex-row gap-1 text-body-sm text-on-surface-variant">
                         <span className="w-3 h-3 rounded-full bg-tertiary"></span>
                         {complianceBreakdown.compliant} Compliant
                       </span>
                       <span className="flex-row gap-1 text-body-sm text-on-surface-variant">
                         <span className="w-3 h-3 rounded-full bg-caution"></span>
                         {complianceBreakdown.doubtful} Doubtful
                       </span>
                       <span className="flex-row gap-1 text-body-sm text-on-surface-variant">
                         <span className="w-3 h-3 rounded-full bg-error"></span>
                         {complianceBreakdown.nonCompliant} Non-Compliant
                       </span>
                    </div>
                 </div>
                 {/* Stacked Bar */}
                 <div className="stacked-bar">
                    <div style={{ width: `${(complianceBreakdown.compliant / total) * 100}%` }} className="bg-tertiary"></div>
                    <div style={{ width: `${(complianceBreakdown.doubtful / total) * 100}%` }} className="bg-caution"></div>
                    <div style={{ width: `${(complianceBreakdown.nonCompliant / total) * 100}%` }} className="bg-error"></div>
                 </div>
              </div>

              {/* List */}
              <div className="stock-list">
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
               <MaterialIcon name="bookmark_add" size={48} className="text-secondary opacity-50 mb-4" />
               <h3 className="text-h3 mb-2">Your watchlist is empty</h3>
               <p className="text-on-surface-variant text-center max-w-sm mb-6">
                 Find a stock in the screener and tap the bookmark icon to save it here for easy tracking.
               </p>
               <button className="btn btn-primary" onClick={() => navigate('/screener')}>
                 Go to Screener
               </button>
            </div>
          )}
        </div>
        
        {/* Alerts Panel - Desktop only */}
        <div className="watchlist-sidebar desktop-only">
          <div className="card-standard p-6 sticky top-24">
            <h4 className="text-label mb-4 flex-row gap-2">
              <MaterialIcon name="notifications" size={18} />
              Recent Alerts
            </h4>
            <div className="alerts-list">
              <p className="text-body-sm text-on-surface-variant italic">No recent compliance changes in your watchlist.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
