import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Building2, Trash2, ArrowRight, Lock, Search, Layers, Activity, MessageSquare } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import ComplianceBadge from '../components/ComplianceBadge'
import './Dashboard.css'

export default function Dashboard() {
  const { user, profile, tier, isPro, isScholar, signOut } = useAuth()
  const [portfolio, setPortfolio] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchPortfolio()
  }, [user])

  async function fetchPortfolio() {
    if (!supabase.isConfigured || !user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setPortfolio(data)
    }
    setLoading(false)
  }

  async function removeTicker(tickerId) {
    if (!supabase.isConfigured) return;
    
    // Optimistic UI update
    setPortfolio(prev => prev.filter(item => item.id !== tickerId))
    
    await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', tickerId)
  }

  const getTierBadgeClass = () => {
    if (tier === 'scholar') return 'badge-scholar';
    if (tier === 'pro') return 'badge-pro';
    return 'badge-free';
  }

  const queriesUsed = profile?.daily_search_count || 0;
  const maxQueries = 5;
  const progressPercentage = Math.min((queriesUsed / maxQueries) * 100, 100);

  const handleToolClick = (path, isLocked) => {
    if (isLocked) {
      navigate('/settings') // Redirect to upgrade
    } else {
      navigate(path)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="shimmer" style={{ height: 40, width: 250, marginBottom: 32 }} />
        <div className="portfolio-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="card shimmer" style={{ height: 160 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container animate-fade-in-up">
      <div className="dashboard-header">
        <div>
          <h1>Command Center</h1>
          <p className="text-muted">Welcome back, {user?.email}</p>
        </div>
        <div className="dashboard-actions">
          <Link to="/settings" className="btn btn-outline btn-sm">Settings</Link>
          <button onClick={signOut} className="btn btn-outline btn-sm">Log Out</button>
        </div>
      </div>

      {/* Overview Identity Card */}
      <div className="card dashboard-identity">
        <div className="identity-left">
          <h2 className="identity-title">Current Plan</h2>
          <div className={`tier-badge ${getTierBadgeClass()}`}>
            {tier ? tier.toUpperCase() : 'FREE'}
          </div>
        </div>
        
        {!isPro && (
          <div className="identity-right">
            <div className="quota-header">
              <span className="quota-label">Daily Screenings Used</span>
              <span className="quota-count">{queriesUsed} / {maxQueries}</span>
            </div>
            <div className="quota-track">
              <div 
                className={`quota-fill ${queriesUsed >= maxQueries ? 'quota-full' : ''}`} 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            {queriesUsed >= maxQueries && (
              <div className="quota-warning">You've hit your daily limit! Upgrade to Pro for unlimited searches.</div>
            )}
          </div>
        )}
      </div>

      {/* Premium Tools Launcher Grid */}
      <div className="dashboard-section">
        <h2 className="section-title">Halaq Tools</h2>
        <div className="tools-grid">
          {/* Unlocked for everyone */}
          <div className="tool-card card" onClick={() => handleToolClick('/screener', false)}>
            <div className="tool-icon-wrapper bg-primary-soft">
              <Search className="tool-icon text-primary" size={24} />
            </div>
            <h3>Deep Screener</h3>
            <p>Single stock analysis using AAOIFI standards.</p>
          </div>

          {/* Pro+ Feature */}
          <div className={`tool-card card ${!isPro ? 'tool-locked' : ''}`} onClick={() => handleToolClick('/batch', !isPro)}>
            {!isPro && <div className="lock-overlay"><Lock size={20} /> Pro</div>}
            <div className="tool-icon-wrapper bg-accent-soft">
              <Layers className="tool-icon text-accent" size={24} />
            </div>
            <h3>Batch Screening</h3>
            <p>Analyze up to 20 tickers simultaneously.</p>
          </div>

          {/* Scholar Feature */}
          <div className={`tool-card card ${!isScholar ? 'tool-locked' : ''}`} onClick={() => handleToolClick('/etf', !isScholar)}>
            {!isScholar && <div className="lock-overlay"><Lock size={20} /> Scholar</div>}
            <div className="tool-icon-wrapper bg-purple-soft">
              <Activity className="tool-icon text-purple" size={24} />
            </div>
            <h3>ETF X-Ray</h3>
            <p>Scan internal holdings of popular indices.</p>
          </div>

          {/* Scholar Feature */}
          <div className={`tool-card card ${!isScholar ? 'tool-locked' : ''}`} onClick={() => handleToolClick('/chat', !isScholar)}>
            {!isScholar && <div className="lock-overlay"><Lock size={20} /> Scholar</div>}
            <div className="tool-icon-wrapper bg-blue-soft">
              <MessageSquare className="tool-icon text-blue" size={24} />
            </div>
            <h3>AI Chatbot</h3>
            <p>Speak to your personal Shariah companion AI.</p>
          </div>
        </div>
      </div>

      <div className="dashboard-section" style={{ marginTop: '3rem' }}>
        <h2 className="section-title">Your Portfolio Watchlist</h2>
        
        {!supabase.isConfigured && (
          <div className="card card-elevated" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-accent)' }}>
            <h3>⚠️ Supabase Not Connected</h3>
            <p>The database is not configured. Please add keys to your `.env` file to enable saving.</p>
          </div>
        )}

        {portfolio.length === 0 ? (
          <div className="portfolio-empty card">
            <Building2 size={48} className="empty-icon" />
            <h3>No stocks followed yet</h3>
            <p className="text-muted">Use the screener to find Halal stocks and add them to your portfolio.</p>
            <Link to="/screener" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Go to Screener
            </Link>
          </div>
        ) : (
          <div className="portfolio-grid">
            {portfolio.map((item) => (
              <div key={item.id} className="card portfolio-card">
                <div className="portfolio-card__header">
                  <div className="portfolio-card__header-main">
                    <div className="portfolio-card__avatar">
                      {(item.company_name || item.ticker).charAt(0).toUpperCase()}
                    </div>
                    <div className="portfolio-card__titles">
                      <h3>{item.ticker}</h3>
                      <span className="portfolio-card__company" title={item.company_name}>
                        {item.company_name || 'Unknown Company'}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <ComplianceBadge status={item.status || 'COMPLIANT'} />
                  </div>
                </div>
                
                <div className="portfolio-card__footer">
                  <Link to={`/screener?q=${item.ticker}`} className="portfolio-link">
                    View report <ArrowRight size={14} />
                  </Link>
                  <button 
                    onClick={() => removeTicker(item.id)}
                    className="btn-icon portfolio-remove"
                    title="Remove from portfolio"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
