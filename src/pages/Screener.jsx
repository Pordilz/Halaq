import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWatchlist } from '../hooks/useWatchlist'
import MaterialIcon from '../components/MaterialIcon'
import ComplianceBadge from '../components/ComplianceBadge'
import StockRowCard from '../components/StockRowCard'
import SetupFlow from '../components/SetupFlow'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { getCurrencySymbol } from '../services/complianceEngine'
import './Screener.css'

const FILTER_OPTIONS = [
  { id: 'JSE', label: 'JSE' },
  { id: 'NASDAQ', label: 'NASDAQ' },
  { id: 'NYSE', label: 'NYSE' },
]

const PAGE_SIZE = 10

export default function Screener() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { isInWatchlist, toggle: toggleWatchlist } = useWatchlist(user)

  useDocumentTitle('Screener', 'Screen any stock for Shariah compliance against AAOIFI standards.')

  const [showSetup, setShowSetup] = useState(location.state?.showSetup || false)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [activeFilters, setActiveFilters] = useState([])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  // Trending state
  const [trending, setTrending] = useState([])
  const [trendingPage, setTrendingPage] = useState(0)
  const [trendingHasMore, setTrendingHasMore] = useState(true)
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [trendingError, setTrendingError] = useState(null)

  const filterRef = useRef(null)
  const abortRef = useRef(null)
  const debounceRef = useRef(null)
  const sentinelRef = useRef(null)

  // Clear setup state on first render
  useEffect(() => {
    if (showSetup) {
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Outside-click on filter dropdown
  useEffect(() => {
    if (!showFilterDropdown) return
    const onDoc = (e) => {
      if (!filterRef.current?.contains(e.target)) setShowFilterDropdown(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setShowFilterDropdown(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [showFilterDropdown])

  // Debounced search
  const runSearch = useCallback(async (q) => {
    if (!q || q.trim().length <= 1) {
      setResults([])
      setSearchError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setSearchError(null)
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(
        (Array.isArray(data) ? data : []).map(item => ({
          ticker: item.symbol,
          name: item.name,
          exchange: item.exchange,
          sector: item.type === 'ETF' ? 'ETF' : '',
          status: null,
        }))
      )
    } catch (err) {
      if (err.name !== 'AbortError') {
        setSearchError('Could not search right now. Please retry.')
        setResults([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query), 280)
    return () => clearTimeout(debounceRef.current)
  }, [query, runSearch])

  useEffect(() => {
    if (query.trim()) {
      setSearchParams({ q: query.trim() }, { replace: true })
    } else if (searchParams.get('q')) {
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Fetch trending
  const fetchTrending = useCallback(async (page) => {
    setTrendingLoading(true)
    setTrendingError(null)
    try {
      const res = await fetch(`/api/trending?page=${page}&size=${PAGE_SIZE}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setTrending(prev => page === 0 ? data.items : [...prev, ...data.items])
      setTrendingHasMore(!!data.hasMore)
    } catch {
      setTrendingError('Could not load trending stocks right now.')
    } finally {
      setTrendingLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrending(0)
  }, [fetchTrending])

  // Infinite scroll for trending
  useEffect(() => {
    if (!sentinelRef.current || query.trim().length > 1) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && trendingHasMore && !trendingLoading) {
        const next = trendingPage + 1
        setTrendingPage(next)
        fetchTrending(next)
      }
    }, { rootMargin: '320px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [trendingHasMore, trendingLoading, trendingPage, fetchTrending, query])

  const toggleFilter = (f) => {
    setActiveFilters(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    )
  }

  const matchesFilters = (item) => {
    if (activeFilters.length === 0) return true
    const ex = (item.exchange || '').toUpperCase()
    if (activeFilters.includes('JSE') && !(ex.includes('JSE') || item.ticker?.endsWith('.JO'))) return false
    if (activeFilters.includes('NASDAQ') && !ex.includes('NAS')) return false
    if (activeFilters.includes('NYSE') && !ex.includes('NYS')) return false
    return true
  }

  const filteredResults = results.filter(matchesFilters)
  const filteredTrending = trending.filter(matchesFilters)
  const navigateToStock = (ticker) => navigate(`/stock/${ticker}`)
  const isSearching = query.trim().length > 1

  return (
    <div className="screener-page container">
      {showSetup && <SetupFlow onComplete={() => setShowSetup(false)} />}

      <div className="screener-hero">
        <h1 className="text-h1 mb-2">Find halal stocks</h1>
        <p className="text-on-surface-variant text-body-lg mb-6">
          Screen JSE and US equities against AAOIFI standards in seconds.
        </p>

        <div className="search-section-row max-w-2xl">
          <div className="search-bar-wrapper">
            <MaterialIcon name="search" size={22} className="search-icon" />
            <input
              type="search"
              className="search-input"
              placeholder="Search by company name or ticker…"
              aria-label="Search stocks"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {query.length > 0 && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <MaterialIcon name="close" size={18} />
              </button>
            )}
          </div>

          <div className="filter-wrapper" ref={filterRef}>
            <button
              type="button"
              className="filter-icon-btn"
              onClick={() => setShowFilterDropdown(o => !o)}
              aria-label="Filters"
              aria-expanded={showFilterDropdown}
            >
              <MaterialIcon name="tune" size={22} />
            </button>

            {showFilterDropdown && (
              <div className="filter-dropdown" role="menu">
                <div className="filter-dropdown-header">Exchanges</div>
                {FILTER_OPTIONS.map(f => (
                  <label key={f.id} className="filter-option">
                    <input
                      type="checkbox"
                      checked={activeFilters.includes(f.id)}
                      onChange={() => toggleFilter(f.id)}
                    />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="filters-strip">
            {activeFilters.map(f => (
              <span key={f} className="filter-chip">
                {f}
                <button
                  type="button"
                  className="remove-filter"
                  onClick={() => toggleFilter(f)}
                  aria-label={`Remove ${f} filter`}
                >
                  <MaterialIcon name="close" size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="screener-content">
        {isSearching ? (
          <SearchPanel
            query={query}
            loading={loading}
            error={searchError}
            results={filteredResults}
            isInWatchlist={isInWatchlist}
            toggleWatchlist={toggleWatchlist}
            onClick={navigateToStock}
            onRetry={() => runSearch(query)}
          />
        ) : (
          <TrendingPanel
            items={filteredTrending}
            loading={trendingLoading && trending.length === 0}
            error={trendingError}
            isInWatchlist={isInWatchlist}
            toggleWatchlist={toggleWatchlist}
            onClick={navigateToStock}
            onRetry={() => { setTrendingPage(0); fetchTrending(0) }}
            sentinelRef={sentinelRef}
            hasMore={trendingHasMore}
            loadingMore={trendingLoading && trending.length > 0}
          />
        )}
      </div>
    </div>
  )
}

/* ---------- Search panel ---------- */
function SearchPanel({ query, loading, error, results, isInWatchlist, toggleWatchlist, onClick, onRetry }) {
  return (
    <div className="results-panel" role="region" aria-label="Search results">
      <div className="results-panel__header">
        <h2 className="results-panel__title">
          <MaterialIcon name="search" size={18} />
          Results for "{query.trim()}"
        </h2>
        {!loading && !error && (
          <span className="results-panel__count">
            {results.length} {results.length === 1 ? 'match' : 'matches'}
          </span>
        )}
      </div>

      <div className="results-panel__columns" aria-hidden="true">
        <div className="results-panel__col-ticker">Ticker</div>
        <div className="results-panel__col-info">Company</div>
        <div className="results-panel__col-status">Status</div>
      </div>

      <div className="results-panel__body">
        {loading ? (
          <div aria-busy="true">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="skeleton-row">
                <div className="skeleton-block skeleton-block--ticker" />
                <div className="skeleton-block skeleton-block--name" />
                <div className="skeleton-block skeleton-block--badge" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-circle">
              <MaterialIcon name="cloud_off" size={36} className="text-error" />
            </div>
            <h3 className="text-h3 mt-4">Could not search</h3>
            <p className="text-on-surface-variant mt-2 max-w-sm mx-auto">{error}</p>
            <button type="button" className="btn btn-secondary mt-6" onClick={onRetry}>Try again</button>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <div className="empty-circle">
              <MaterialIcon name="search_off" size={36} className="text-outline-variant" />
            </div>
            <h3 className="text-h3 mt-4">No stocks found</h3>
            <p className="text-on-surface-variant mt-2 max-w-sm mx-auto">
              We couldn't find any equities matching "{query}". Try a different ticker.
            </p>
          </div>
        ) : (
          <div className="results-panel__list">
            {results.map(stock => (
              <StockRowCard
                key={stock.ticker}
                {...stock}
                inWatchlist={isInWatchlist(stock.ticker)}
                onToggleWatchlist={() => toggleWatchlist(stock)}
                onClick={() => onClick(stock.ticker)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="results-panel__footer">
        <span>Tap a result to see the full compliance breakdown.</span>
      </div>
    </div>
  )
}

/* ---------- Trending panel ---------- */
function TrendingPanel({ items, loading, error, isInWatchlist, toggleWatchlist, onClick, onRetry, sentinelRef, hasMore, loadingMore }) {
  return (
    <div className="results-panel" role="region" aria-label="Trending stocks">
      <div className="results-panel__header">
        <h2 className="results-panel__title">
          <MaterialIcon name="trending_up" size={18} fill />
          Trending
        </h2>
        <span className="results-panel__count">Live · {items.length} loaded</span>
      </div>

      <div className="trending-columns" aria-hidden="true">
        <div className="trending-col-ticker">Ticker</div>
        <div className="trending-col-info">Company</div>
        <div className="trending-col-price">Last price</div>
        <div className="trending-col-change">Change</div>
        <div className="trending-col-actions">Actions</div>
      </div>

      <div className="results-panel__body">
        {loading ? (
          <div aria-busy="true">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="trending-row trending-row--skeleton">
                <div className="skeleton-block skeleton-block--ticker" />
                <div className="skeleton-block skeleton-block--name" />
                <div className="skeleton-block" style={{ width: '4rem', height: '1rem' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-circle">
              <MaterialIcon name="cloud_off" size={36} className="text-error" />
            </div>
            <h3 className="text-h3 mt-4">Could not load</h3>
            <p className="text-on-surface-variant mt-2 max-w-sm mx-auto">{error}</p>
            <button type="button" className="btn btn-secondary mt-6" onClick={onRetry}>Try again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p className="text-on-surface-variant">No stocks match the active filters.</p>
          </div>
        ) : (
          <div className="trending-list">
            {items.map(item => (
              <TrendingRow
                key={item.ticker}
                item={item}
                inWatchlist={isInWatchlist(item.ticker)}
                onToggleWatchlist={() => toggleWatchlist({
                  ticker: item.ticker,
                  name: item.name,
                  exchange: item.exchange,
                })}
                onClick={() => onClick(item.ticker)}
              />
            ))}
            <div ref={sentinelRef} className="trending-sentinel">
              {loadingMore && <MaterialIcon name="refresh" className="spinner text-outline" size={20} />}
              {!hasMore && items.length > 0 && (
                <span className="trending-sentinel__text">You've reached the end of the trending list.</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="results-panel__footer">
        <span>Prices via Yahoo Finance · refreshed on the edge every minute.</span>
      </div>
    </div>
  )
}

function TrendingRow({ item, inWatchlist, onToggleWatchlist, onClick }) {
  const symbol = getCurrencySymbol(item.currency)
  const positive = item.regularMarketChangePercent >= 0
  const priceLabel = Number.isFinite(item.regularMarketPrice) && item.regularMarketPrice > 0
    ? `${symbol}${item.regularMarketPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'
  const changeLabel = Number.isFinite(item.regularMarketChangePercent)
    ? `${positive ? '+' : ''}${item.regularMarketChangePercent.toFixed(2)}%`
    : '—'

  return (
    <div
      className="trending-row"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="trending-row__ticker">{item.ticker}</div>
      <div className="trending-row__info">
        <p className="trending-row__name">{item.name}</p>
        <span className="trending-row__exchange">{item.exchange}</span>
      </div>
      <div className="trending-row__price">{priceLabel}</div>
      <div className={`trending-row__change ${positive ? 'is-up' : 'is-down'}`}>
        <MaterialIcon name={positive ? 'trending_up' : 'trending_down'} size={14} />
        {changeLabel}
      </div>
      <button
        type="button"
        className="trending-row__bookmark"
        onClick={(e) => { e.stopPropagation(); onToggleWatchlist?.() }}
        aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        <MaterialIcon name="bookmark" fill={inWatchlist} className={inWatchlist ? 'text-secondary' : 'text-outline'} size={20} />
      </button>
    </div>
  )
}
