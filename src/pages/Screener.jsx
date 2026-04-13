import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from '../components/MaterialIcon'
import StockRowCard from '../components/StockRowCard'
import SetupFlow from '../components/SetupFlow'
import './Screener.css'

export default function Screener() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const [showSetup, setShowSetup] = useState(location.state?.showSetup || false)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  
  const [activeFilters, setActiveFilters] = useState([])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const availableFilters = ['JSE', 'NASDAQ', 'NYSE', 'Compliant Only']
  const [watchlistTickers, setWatchlistTickers] = useState(new Set())
  const { user } = useAuth()
  const navigate = useNavigate()
  const searchTimeout = useRef(null)

  // Remove location state so refresh doesn't show setup again
  useEffect(() => {
    if (showSetup) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [])

  const searchSymbols = useCallback((q) => {
    clearTimeout(searchTimeout.current)
    if (!q || q.trim().length <= 1) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.map(item => ({
            ticker: item.symbol,
            name: item.name,
            exchange: item.exchange,
            sector: item.type,
            status: 'UNKNOWN',
            marketCap: 'N/A'
          })))
        }
      } catch (e) {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  useEffect(() => {
    searchSymbols(query)
  }, [query, searchSymbols])

  const toggleFilter = (f) => {
    if (activeFilters.includes(f)) {
      setActiveFilters(activeFilters.filter(filter => filter !== f))
    } else {
      setActiveFilters([...activeFilters, f])
    }
  }

  const filteredResults = results.filter(r => {
    if (activeFilters.length === 0) return true;
    let pass = true;
    if (activeFilters.includes('JSE') && r.exchange && !r.exchange.toUpperCase().includes('JSE')) pass = false;
    if (activeFilters.includes('NASDAQ') && r.exchange && !r.exchange.toUpperCase().includes('NAS')) pass = false;
    if (activeFilters.includes('NYSE') && r.exchange && !r.exchange.toUpperCase().includes('NYS')) pass = false;
    // We cannot filter by Compliant Only yet because status is UNKNOWN until clicked
    return pass;
  })

  const toggleWatchlist = (ticker) => {
    const next = new Set(watchlistTickers)
    if (next.has(ticker)) {
      next.delete(ticker)
    } else {
      next.add(ticker)
    }
    setWatchlistTickers(next)
  }

  const navigateToStock = (ticker) => {
    navigate(`/stock/${ticker}`)
  }

  return (
    <div className="screener-page container">
      {showSetup && <SetupFlow onComplete={() => setShowSetup(false)} />}
      
      {/* Hero Search Section */}
      <div className="screener-hero">
        <h1 className="text-h1 mb-2">Find Halal Stocks</h1>
        <p className="text-on-surface-variant text-body-lg mb-6">
          Screen thousands of JSE and US equities against AAOIFI standards.
        </p>

        <div className="search-section-row max-w-2xl">
          <div className="search-bar-wrapper">
            <MaterialIcon name="search" size={24} className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search by company name or ticker..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query.length > 0 && (
              <button className="clear-btn" onClick={() => setQuery('')}>
                <MaterialIcon name="close" size={20} />
              </button>
            )}
          </div>
          
          <div className="filter-wrapper relative">
            <button 
              className="filter-icon-btn" 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              aria-label="Filters"
            >
              <MaterialIcon name="tune" size={24} />
            </button>
            
            {showFilterDropdown && (
              <div className="filter-dropdown">
                {availableFilters.map(f => (
                  <label key={f} className="filter-option">
                    <input type="checkbox" checked={activeFilters.includes(f)} onChange={() => toggleFilter(f)} />
                    <span className="text-body-sm">{f}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Active Filters Strip */}
        {activeFilters.length > 0 && (
          <div className="filters-strip mt-4">
            <div className="active-chips">
              {activeFilters.map(f => (
                <span key={f} className="filter-chip">
                  {f}
                  <button className="remove-filter" onClick={() => toggleFilter(f)}>
                    <MaterialIcon name="close" size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="screener-content">
        {/* Main List Area */}
        <div className="results-area">
          {query.length === 0 ? (
            <div className="trending-section animate-entrance">
              <h2 className="text-h3 mb-4 flex-row gap-2">
                <MaterialIcon name="trending_up" className="text-primary" /> 
                Trending Searches
              </h2>
              <div className="stock-list">
                {[
                  { ticker: 'AGL', name: 'Anglo American', sector: 'Mining', exchange: 'JSE', status: null, marketCap: 'R450B' },
                  { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Consumer Cyclical', exchange: 'NASDAQ', status: null, marketCap: '$600B' },
                  { ticker: 'FSR', name: 'FirstRand Ltd', sector: 'Finance', exchange: 'JSE', status: null, marketCap: 'R380B' },
                  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ', status: null, marketCap: '$2.8T' },
                ].map(stock => (
                   <StockRowCard 
                     key={stock.ticker}
                     {...stock}
                     inWatchlist={watchlistTickers.has(stock.ticker)}
                     onToggleWatchlist={() => toggleWatchlist(stock.ticker)}
                     onClick={() => navigateToStock(stock.ticker)}
                   />
                ))}
              </div>
            </div>
          ) : loading ? (
             <div className="loading-state">
               <MaterialIcon name="refresh" className="spinner text-primary" size={32} />
               <p className="mt-4 text-on-surface-variant font-subheading">Searching stocks...</p>
             </div>
          ) : results.length > 0 ? (
            <div className="results-section animate-entrance">
              <div className="results-headers desktop-only">
                <div style={{ width: '3.5rem', textAlign: 'center' }} className="text-micro text-outline tracking-widest">TICKER</div>
                <div style={{ flex: 1, paddingLeft: '1rem' }} className="text-micro text-outline tracking-widest">COMPANY INFO</div>
                <div style={{ width: '5rem', textAlign: 'right', paddingRight: '1rem' }} className="text-micro text-outline tracking-widest">MKT CAP</div>
                <div style={{ width: '6rem', textAlign: 'right' }} className="text-micro text-outline tracking-widest uppercase">Status</div>
              </div>
              <div className="stock-list mt-2">
                {filteredResults.length > 0 ? (
                  filteredResults.map(stock => (
                     <StockRowCard 
                       key={stock.ticker}
                       {...stock}
                       inWatchlist={watchlistTickers.has(stock.ticker)}
                       onToggleWatchlist={() => toggleWatchlist(stock.ticker)}
                       onClick={() => navigateToStock(stock.ticker)}
                     />
                  ))
                ) : (
                  <div className="text-center p-8 text-on-surface-variant text-body-sm bg-surface-container-low rounded-xl">
                    No stocks match your active filters.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state animate-entrance">
               <div className="empty-circle">
                 <MaterialIcon name="search_off" size={48} className="text-outline-variant" />
               </div>
               <h3 className="text-h3 mt-4">No stocks found</h3>
               <p className="text-on-surface-variant mt-2 max-w-sm mx-auto text-center">
                 We couldn't find any JSE or US equities matching "{query}". Double-check the ticker symbol or company name.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
