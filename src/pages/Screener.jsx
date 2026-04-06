import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, AlertTriangle, Building2, TrendingUp, Info, Loader2, BookmarkPlus, CheckCircle2, X, Lock } from 'lucide-react'
import { fetchAllScreeningData } from '../services/yahooFinanceApi'
import { screenStock } from '../services/complianceEngine'
import ComplianceBadge from '../components/ComplianceBadge'
import RatioBar from '../components/RatioBar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Link, useLocation } from 'react-router-dom'
import './Screener.css'

/**
 * Format large numbers to human readable (e.g. 2.8T, 150B, 30M)
 */
function formatMarketCap(value) {
  if (!value) return 'N/A'
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  return value.toLocaleString()
}

/**
 * Format currency amount
 */
function formatCurrency(value, currency = 'USD') {
  if (!value && value !== 0) return 'N/A'
  const symbol = currency === 'ZAR' ? 'R' : '$'
  if (Math.abs(value) >= 1e9) return `${symbol}${(value / 1e9).toFixed(2)}B`
  if (Math.abs(value) >= 1e6) return `${symbol}${(value / 1e6).toFixed(2)}M`
  return `${symbol}${value.toLocaleString()}`
}

export default function Screener() {
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [rawData, setRawData] = useState(null)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const searchTimeout = useRef(null)
  const wrapperRef = useRef(null)
  
  // Portfolio save state
  const { user, isPro, isScholar } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const query = params.get('q')
    if (query) {
      setTicker(query.toUpperCase())
      performScreen(query)
    }
  }, [location.search])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Debounced symbol search
  const searchSymbols = useCallback((query) => {
    clearTimeout(searchTimeout.current)
    if (!query || query.trim().length < 1) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    setSearchLoading(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data)
          setShowDropdown(data.length > 0)
          setActiveIndex(-1)
        }
      } catch (e) {
        setSuggestions([])
      } finally {
        setSearchLoading(false)
      }
    }, 280)
  }, [])

  async function performScreen(targetTicker) {
    const cleanTicker = targetTicker.trim().toUpperCase()
    if (!cleanTicker) return

    setLoading(true)
    setError(null)
    setResult(null)
    setRawData(null)
    setSaved(false)

    try {
      const data = await fetchAllScreeningData(cleanTicker)
      setRawData(data)

      const complianceResult = screenStock(data.profile, data.balanceSheet, data.income)
      setResult(complianceResult)
      
      // Check if already saved
      if (user && supabase.isConfigured) {
        const { data: existing } = await supabase
          .from('portfolio_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('ticker', complianceResult.ticker)
          .single()
          
        if (existing) setSaved(true)
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data. Please check the ticker and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleScreen(e) {
    e.preventDefault()
    setShowDropdown(false)
    performScreen(ticker)
  }

  function handleInputChange(e) {
    const val = e.target.value
    setTicker(val)
    searchSymbols(val)
  }

  function handleSuggestionSelect(suggestion) {
    setTicker(suggestion.symbol)
    setSuggestions([])
    setShowDropdown(false)
    performScreen(suggestion.symbol)
  }

  function handleKeyDown(e) {
    if (!showDropdown || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSuggestionSelect(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIndex(-1)
    }
  }
  
  async function saveToPortfolio() {
    if (!user) return
    if (!supabase.isConfigured) {
      alert("Database is not configured yet. Awaiting credentials.")
      return
    }
    
    setSaving(true)
    
    // Check Watchlist Limits
    const limit = isScholar ? 500 : (isPro ? 200 : 10);
    const { count, error: countError } = await supabase
      .from('portfolio_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
      
    if (!countError && count >= limit) {
      alert(`You have reached your portfolio limit of ${limit} stocks.\n\nPlease upgrade your plan to add more.`);
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('portfolio_items')
      .insert([
        {
          user_id: user.id,
          ticker: result.ticker,
          company_name: result.companyName,
          status: result.status
        }
      ])
      
    if (!error) {
      setSaved(true)
    } else {
      console.error(error)
      alert("Error saving to portfolio")
    }
    setSaving(false)
  }

  return (
    <div className="screener">
      <div className="container">
        {/* Header */}
        <div className="screener__header animate-fade-in-up">
          <h1>Stock Screener</h1>
          <p className="text-muted">
            Enter a JSE or US ticker to check Shariah compliance using AAOIFI standards
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleScreen} className="screener__search animate-fade-in-up delay-1">
          <div className="screener__input-wrapper" ref={wrapperRef}>
            <Search size={20} className={`screener__input-icon${searchLoading ? ' screener__input-icon--spinning' : ''}`} />
            <input
              id="ticker-input"
              type="text"
              placeholder="Search by company name or ticker (e.g. Apple, AAPL, MTN)"
              value={ticker}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              className="screener__input"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
            />
            {ticker && (
              <button
                type="button"
                className="screener__clear-btn"
                onClick={() => { setTicker(''); setSuggestions([]); setShowDropdown(false) }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}

            {/* Autocomplete dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <ul className="screener__dropdown" role="listbox">
                {suggestions.map((s, i) => (
                  <li
                    key={s.symbol}
                    role="option"
                    aria-selected={i === activeIndex}
                    className={`screener__dropdown-item${i === activeIndex ? ' screener__dropdown-item--active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(s) }}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <span className="screener__dropdown-symbol">{s.symbol}</span>
                    <span className="screener__dropdown-name">{s.name}</span>
                    <span className="screener__dropdown-exchange">{s.exchange}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-lg screener__submit"
            disabled={loading || !ticker.trim()}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="screener__spinner" />
                Screening...
              </>
            ) : (
              <>
                <Search size={18} />
                Screen
              </>
            )}
          </button>
        </form>

        {/* Sample tickers — hidden while dropdown is open */}
        {!showDropdown && (
          <div className="screener__samples animate-fade-in-up delay-2">
            <span>Try:</span>
            {['AAPL', 'MSFT', 'SBK.JO', 'MTN.JO', 'NPN.JO'].map(t => (
              <button
                key={t}
                className="screener__sample-btn"
                onClick={() => { setTicker(t); performScreen(t) }}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="screener__loading">
            <div className="screener__loading-card card">
              <div className="shimmer" style={{ height: 40, width: '60%', marginBottom: 16 }} />
              <div className="shimmer" style={{ height: 20, width: '40%', marginBottom: 24 }} />
              <div className="shimmer" style={{ height: 60, width: '100%', marginBottom: 12 }} />
              <div className="shimmer" style={{ height: 60, width: '100%', marginBottom: 12 }} />
              <div className="shimmer" style={{ height: 60, width: '100%', marginBottom: 12 }} />
              <div className="shimmer" style={{ height: 60, width: '100%' }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="screener__error animate-fade-in-up">
            <AlertTriangle size={20} />
            <div>
              <strong>Screening Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="screener__results animate-fade-in-up">
            {/* Company Info + Badge */}
            <div className="screener__result-header card card-elevated">
              <div className="screener__company-info">
                <div className="screener__company-top">
                  <div>
                    <div className="screener__ticker-label">{result.ticker}</div>
                    <h2 className="screener__company-name">{result.companyName}</h2>
                    <div className="screener__company-meta">
                      <span className="screener__meta-item">
                        <Building2 size={14} />
                        {result.sector} — {result.industry}
                      </span>
                      <span className="screener__meta-item">
                        <TrendingUp size={14} />
                        MCap: {formatMarketCap(result.marketCap)}
                      </span>
                    </div>
                  </div>
                  <ComplianceBadge status={result.status} />
                </div>
                
                <p className="screener__status-reason">{result.statusReason}</p>
                
                <div className="screener__result-actions">
                  {user ? (
                    <button 
                      onClick={saveToPortfolio} 
                      disabled={saved || saving}
                      className={`btn ${saved ? 'btn-outline' : 'btn-primary'}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}
                    >
                      {saving ? <Loader2 size={16} className="spinner" /> : 
                       saved ? <CheckCircle2 size={16} /> : <BookmarkPlus size={16} />}
                      {saved ? 'Saved in Portfolio' : 'Add to Portfolio'}
                    </button>
                  ) : (
                    <div className="screener__login-prompt">
                      <span>Want to track this stock?</span>
                      <Link to="/login" className="btn btn-sm btn-outline">
                        Login to Save
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Business Activity Screen */}
            <div className="screener__section card">
              <h3 className="screener__section-title">
                <Building2 size={18} />
                Business Activity Screen
              </h3>
              <div className={`screener__business-result screener__business-result--${result.businessScreen.status.toLowerCase()}`}>
                <div className="screener__business-status">
                  {result.businessScreen.status}
                </div>
                {isPro ? (
                  <>
                    <p className="screener__business-reason">{result.businessScreen.reason}</p>
                    <p className="screener__business-detail">{result.businessScreen.detail}</p>
                  </>
                ) : (
                  <div className="screener__paywall-blur-container">
                    <p className="screener__business-reason">Detailed breakdown locked</p>
                    <p className="screener__business-detail">The specifics of this company's business activities and flagged revenue streams are hidden for this tier.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Ratios */}
            <div className="screener__section card">
              <h3 className="screener__section-title">
                <TrendingUp size={18} />
                Financial Ratio Screen
              </h3>
              
              <div className={!isPro ? "screener__paywall-blur-container" : ""}>
                <div className="screener__ratios">
                  {result.financialScreen.ratios.map((ratio, i) => (
                    <RatioBar key={i} {...ratio} />
                  ))}
                </div>
                {rawData && (
                  <div className="screener__raw-data">
                    <details>
                      <summary>
                        <Info size={14} />
                        View Raw Financial Data
                      </summary>
                      <div className="screener__raw-grid">
                        <div className="screener__raw-item">
                          <span className="screener__raw-label">Total Debt</span>
                          <span className="screener__raw-value">{formatCurrency(rawData.balanceSheet.totalDebt, result.currency)}</span>
                        </div>
                        <div className="screener__raw-item">
                          <span className="screener__raw-label">Market Cap</span>
                          <span className="screener__raw-value">{formatCurrency(result.marketCap, result.currency)}</span>
                        </div>
                        <div className="screener__raw-item">
                          <span className="screener__raw-label">Cash & ST Investments</span>
                          <span className="screener__raw-value">{formatCurrency(rawData.balanceSheet.cashAndShortTermInvestments, result.currency)}</span>
                        </div>
                        <div className="screener__raw-item">
                          <span className="screener__raw-label">Net Receivables</span>
                          <span className="screener__raw-value">{formatCurrency(rawData.balanceSheet.netReceivables, result.currency)}</span>
                        </div>
                        <div className="screener__raw-item">
                          <span className="screener__raw-label">Total Revenue</span>
                          <span className="screener__raw-value">{formatCurrency(rawData.income.revenue, result.currency)}</span>
                        </div>
                        <div className="screener__raw-item">
                          <span className="screener__raw-label">Interest Income</span>
                          <span className="screener__raw-value">{formatCurrency(rawData.income.interestIncome, result.currency)}</span>
                        </div>
                        <div className="screener__raw-item">
                          <span className="screener__raw-label">Balance Sheet Period</span>
                          <span className="screener__raw-value">{result.dataSources.balanceSheetPeriod}</span>
                        </div>
                        <div className="screener__raw-item">
                          <span className="screener__raw-label">Income Statement Period</span>
                          <span className="screener__raw-value">{result.dataSources.incomeStatementPeriod}</span>
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
              
              {!isPro && (
                <div className="screener__paywall-overlay">
                  <Lock size={32} className="screener__paywall-icon" />
                  <h4>Financial Details Locked</h4>
                  <p>Upgrade to Pro to see the exact ratios and raw data calculations.</p>
                  <Link to="/settings" className="btn btn-primary">Upgrade to Pro</Link>
                </div>
              )}
            </div>

            {result.purificationNote && (
              <div className="screener__section card screener__purification" style={{ position: 'relative' }}>
                <h3 className="screener__section-title">
                  <AlertTriangle size={18} />
                  Purification Required
                </h3>
                <div className={!isPro ? "screener__paywall-blur-container" : ""}>
                  <p>{result.purificationNote}</p>
                </div>
                {!isPro && (
                  <div className="screener__paywall-overlay screener__paywall-overlay--small">
                    <Lock size={20} className="screener__paywall-icon" />
                    <span>Locked</span>
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className="screener__disclaimer">
              <Info size={16} />
              <p>{result.disclaimer}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

