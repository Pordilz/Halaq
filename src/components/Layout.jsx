import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from './MaterialIcon'
import Logo from './Logo'
import DisclaimerNotice from './DisclaimerNotice'
import './Layout.css'

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: 'space_dashboard' },
  { to: '/screener', label: 'Screener', icon: 'search' },
  { to: '/watchlist', label: 'Watchlist', icon: 'bookmarks' },
  { to: '/learn', label: 'Learn', icon: 'school' },
]

const PREMIUM_TOOLS = [
  { to: '/batch', label: 'Batch', icon: 'layers' },
  { to: '/etf', label: 'ETF X-Ray', icon: 'monitoring' },
  { to: '/chat', label: 'AI Chat', icon: 'forum' },
]

export default function Layout({ children }) {
  const location = useLocation()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  // Hide shell completely on landing/auth pages
  const isAuthPage = ['/', '/login', '/signup'].includes(location.pathname)

  // Close notifications dropdown on outside click / Escape
  useEffect(() => {
    if (!notifOpen) return
    const onDocClick = (e) => {
      if (!notifRef.current?.contains(e.target)) setNotifOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setNotifOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [notifOpen])

  if (isAuthPage) {
    return <main className="main-auth">{children}</main>
  }

  const userInitials = (profile?.full_name || user?.email || 'H')
    .charAt(0)
    .toUpperCase()

  const homePath = user ? '/home' : '/'

  return (
    <div className="layout">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* ---------- Mobile header ---------- */}
      <header className="mobile-header glass-panel">
        <Link to={homePath} className="logo" aria-label="Halaq home">
          <Logo size={22} color="var(--color-primary)" title="" />
          <span className="logo-text">Halaq</span>
        </Link>
        <div className="mobile-header-actions">
          {user ? (
            <Link to="/profile" className="avatar-chip focus-ghost" aria-label="Profile">
              {userInitials}
            </Link>
          ) : (
            <Link to="/login" className="btn btn-secondary topbar-login">Log in</Link>
          )}
        </div>
      </header>

      {/* ---------- Desktop sidebar ---------- */}
      <aside className="desktop-sidebar" aria-label="Primary navigation">
        <div className="sidebar-logo-area">
          <Link to={homePath} className="logo" aria-label="Halaq home">
            <Logo size={28} color="var(--color-primary)" title="" />
            <span className="logo-text">Halaq</span>
          </Link>
        </div>

        <nav className="desktop-nav">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {active && <div className="nav-indicator" />}
                <MaterialIcon name={item.icon} fill={active} size={22} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </Link>
            )
          })}

          {user && (
            <>
              <div className="nav-divider" />
              <div className="nav-section-title">Premium tools</div>
              {PREMIUM_TOOLS.map(item => {
                const active = location.pathname.startsWith(item.to)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`nav-item ${active ? 'active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {active && <div className="nav-indicator" />}
                    <MaterialIcon name={item.icon} fill={active} size={22} className="nav-icon" />
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

      {/* ---------- Desktop topbar (no global search) ---------- */}
      <header className="desktop-topbar glass-panel">
        <div className="topbar-context">
          <span className="topbar-eyebrow">Halaq</span>
          <span className="topbar-page">{topbarTitle(location.pathname)}</span>
        </div>
        <div className="topbar-actions" ref={notifRef}>
          <button
            type="button"
            className="icon-btn focus-ghost"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen(o => !o)}
          >
            <MaterialIcon name="notifications" outline className="text-on-surface-variant" />
          </button>
          {notifOpen && (
            <div className="notif-popover" role="dialog" aria-label="Notifications">
              <div className="notif-popover__header">
                <span>Notifications</span>
              </div>
              <div className="notif-popover__empty">
                <MaterialIcon name="notifications_off" size={24} className="text-outline" />
                <p>No new alerts.</p>
                <p className="notif-popover__hint">
                  Compliance change alerts will appear here once you enable them in{' '}
                  <Link to="/profile" className="text-primary">profile settings</Link>.
                </p>
              </div>
            </div>
          )}
          {user ? (
            <Link to="/profile" className="avatar-chip focus-ghost" aria-label="Profile">
              {userInitials}
            </Link>
          ) : (
            <Link to="/login" className="btn btn-secondary topbar-login">
              Log in
            </Link>
          )}
        </div>
      </header>

      <main id="main-content" className="main-content" tabIndex={-1}>
        {children}
      </main>

      {/* ---------- Mobile bottom nav ---------- */}
      {!location.pathname.startsWith('/stock/') && (
        <div className="mobile-safe-area">
          <nav className="mobile-bottom-nav glass-panel" aria-label="Primary navigation">
            {NAV_ITEMS.map(item => {
              const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`mobile-nav-item ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {active && <div className="mobile-nav-indicator" />}
                  <MaterialIcon name={item.icon} fill={active} size={22} className="mobile-nav-icon" />
                  <span className="mobile-nav-label">{item.label}</span>
                </Link>
              )
            })}
            <Link
              to="/profile"
              className={`mobile-nav-item ${location.pathname.startsWith('/profile') ? 'active' : ''}`}
              aria-current={location.pathname.startsWith('/profile') ? 'page' : undefined}
            >
              <MaterialIcon name="person" fill={location.pathname.startsWith('/profile')} size={22} className="mobile-nav-icon" />
              <span className="mobile-nav-label">Profile</span>
            </Link>
          </nav>
        </div>
      )}
    </div>
  )
}

function topbarTitle(pathname) {
  if (pathname.startsWith('/home')) return 'Home'
  if (pathname.startsWith('/screener')) return 'Screener'
  if (pathname.startsWith('/watchlist')) return 'Watchlist'
  if (pathname.startsWith('/learn')) return 'Learn'
  if (pathname.startsWith('/profile')) return 'Profile'
  if (pathname.startsWith('/upgrade')) return 'Plans'
  if (pathname.startsWith('/batch')) return 'Batch'
  if (pathname.startsWith('/etf')) return 'ETF X-Ray'
  if (pathname.startsWith('/chat')) return 'AI Chat'
  if (pathname.startsWith('/stock/')) return 'Stock report'
  return ''
}
