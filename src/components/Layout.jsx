import { Link, useLocation } from 'react-router-dom'
import { Shield, Menu, X, User } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/screener', label: 'Screener' },
  ]
  
  if (user) {
    navLinks.push({ to: '/dashboard', label: 'Dashboard' })
    navLinks.push({ to: '/settings', label: 'Settings' })
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header__inner container">
          <Link to="/" className="header__brand">
            <Shield className="header__logo-icon" size={28} />
            <span className="header__brand-name">Halaq</span>
          </Link>

          <nav className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`}>
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`header__link ${location.pathname === link.to ? 'header__link--active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {!user ? (
              <Link to="/login" className="btn btn-outline btn-sm" onClick={() => setMenuOpen(false)}>
                Login
              </Link>
            ) : null}

            <Link to="/screener" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>
              Screen a Stock
            </Link>
          </nav>

          <button
            className="header__menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <main className="main">
        {children}
      </main>

      <footer className="footer">
        <div className="footer__inner container">
          <div className="footer__brand">
            <Shield size={20} className="footer__logo-icon" />
            <span>Halaq</span>
          </div>
          <div className="footer__disclaimer">
            <p>
              <strong>Shariah Advisory Note:</strong> This tool provides a screening framework
              based on AAOIFI standards. It is not a fatwa. For certainty on specific investments,
              consult a qualified Islamic finance scholar.
            </p>
          </div>
          <div className="footer__bottom">
            <p>&copy; {new Date().getFullYear()} Halaq. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
