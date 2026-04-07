import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from './MaterialIcon'
import DisclaimerNotice from './DisclaimerNotice'
import './Layout.css'
import { useState, useEffect } from 'react'

export default function Layout({ children }) {
  const location = useLocation()
  const { user, profile } = useAuth()
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Hide shell elements completely on auth/onboarding screens
  const isAuthPage = ['/', '/login', '/signup'].includes(location.pathname)

  if (isAuthPage) {
    return <main className="main-auth">{children}</main>
  }

  const navItems = [
    { to: '/screener', label: 'Screener', icon: 'search' },
    { to: '/watchlist', label: 'Watchlist', icon: 'bookmarks' },
    { to: '/learn', label: 'Learn', icon: 'school' },
    { to: '/profile', label: 'Profile', icon: 'person' },
  ]
  
  // Conditionally add monetized features (from implementation plan decisions)
  const premiumTools = [
    { to: '/batch', label: 'Batch', icon: 'layers' },
    { to: '/etf', label: 'ETF X-Ray', icon: 'activity' },
    { to: '/chat', label: 'AI Chat', icon: 'message' },
  ]

  const userInitials = profile?.email ? profile.email.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')

  return (
    <div className="layout">
      {/* =========================================
          MOBILE SHELL
      ========================================= */}
      <header className="mobile-header glass-panel">
        <Link to="/screener" className="logo">
          <img src="/favicon.svg" alt="Halaq Logo" className="logo-icon" style={{ width: 20, height: 20 }} />
          <span className="logo-text">Halaq</span>
        </Link>
        <div className="mobile-header-actions">
          <button className="icon-btn focus-ghost">
            <MaterialIcon name="search" outline className="text-primary" />
          </button>
          <button className="icon-btn focus-ghost">
            <MaterialIcon name="notifications" outline className="text-primary" />
          </button>
        </div>
      </header>

      {/* =========================================
          DESKTOP SHELL
      ========================================= */}
      <aside className="desktop-sidebar">
        <div className="sidebar-logo-area">
          <Link to="/screener" className="logo">
            <img src="/favicon.svg" alt="Halaq Logo" className="logo-icon" style={{ width: 28, height: 28 }} />
            <span className="logo-text">Halaq</span>
          </Link>
        </div>
        
        <nav className="desktop-nav">
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.to)
            return (
              <Link key={item.to} to={item.to} className={`nav-item ${active ? 'active' : ''}`}>
                {active && <div className="nav-indicator" />}
                <MaterialIcon name={item.icon} fill={active} size={24} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </Link>
            )
          })}
          
          {user && (
            <>
              <div className="nav-divider" />
              <div className="nav-section-title">Premium Tools</div>
              {premiumTools.map(item => {
                const active = location.pathname.startsWith(item.to)
                return (
                  <Link key={item.to} to={item.to} className={`nav-item ${active ? 'active' : ''}`}>
                    {active && <div className="nav-indicator" />}
                    <MaterialIcon name={item.icon} fill={active} size={24} className="nav-icon" />
                    <span className="nav-label">{item.label}</span>
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <DisclaimerNotice compact />
        </div>
      </aside>

      <header className="desktop-topbar glass-panel">
        <div className="topbar-search">
          <MaterialIcon name="search" outline size={20} className="text-outline" />
          <input type="text" placeholder="Search by name or ticker..." className="topbar-search-input focus-ghost" />
        </div>
        <div className="topbar-actions">
          <button className="icon-btn focus-ghost">
            <MaterialIcon name="notifications" outline className="text-on-surface-variant" />
          </button>
          {user ? (
            <Link to="/profile" className="avatar-chip focus-ghost">
              {userInitials}
            </Link>
          ) : (
            <Link to="/login" className="btn btn-secondary" style={{ minHeight: '32px', height: '40px' }}>Log In</Link>
          )}
        </div>
      </header>

      {/* =========================================
          MAIN CONTENT AREA
      ========================================= */}
      <main className="main-content">
        {children}
      </main>

      {/* =========================================
          MOBILE BOTTOM NAV & DISCLAIMER
      ========================================= */}
      {!location.pathname.startsWith('/stock/') && (
        <div className="mobile-safe-area">
          <div className="mobile-disclaimer-wrapper">
            <DisclaimerNotice compact />
          </div>
          
          <nav className="mobile-bottom-nav glass-panel">
            {navItems.map(item => {
              const active = location.pathname.startsWith(item.to)
              return (
                <Link key={item.to} to={item.to} className={`mobile-nav-item ${active ? 'active' : ''}`}>
                  {active && <div className="mobile-nav-indicator" />}
                  <MaterialIcon name={item.icon} fill={active} size={24} className="mobile-nav-icon" />
                  <span className="mobile-nav-label">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      )}

    </div>
  )
}
