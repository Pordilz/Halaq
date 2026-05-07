import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from '../components/MaterialIcon'
import Logo from '../components/Logo'
import './AuthShell.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [error, setError] = useState(null)
  const [view, setView] = useState('login') // 'login' | 'forgot' | 'forgot-success'
  const [resetEmail, setResetEmail] = useState('')

  const { signIn, sendPasswordReset, signInWithProvider } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email.trim(), password)
    if (error) {
      const msg = /invalid login/i.test(error.message)
        ? 'Incorrect email or password. Please try again.'
        : error.message
      setError(msg)
      setLoading(false)
      return
    }
    const params = new URLSearchParams(location.search)
    const redirect = params.get('redirect') || '/home'
    navigate(redirect)
  }

  async function handleOAuth(provider) {
    setOauthLoading(provider)
    setError(null)
    const { error } = await signInWithProvider(provider)
    if (error) {
      setError(`${provider === 'google' ? 'Google' : 'Apple'} sign-in failed: ${error.message}`)
      setOauthLoading(null)
    }
    // Otherwise the browser is redirected — no need to clear loading state.
  }

  async function handleResetSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const target = (resetEmail || email).trim()
    const { error } = await sendPasswordReset(target)
    setLoading(false)
    if (error) {
      setError(error.message || 'Could not send reset email.')
      return
    }
    setView('forgot-success')
  }

  if (view === 'forgot' || view === 'forgot-success') {
    const isSuccess = view === 'forgot-success'
    return (
      <div className="auth-shell">
        <div className="auth-shell__card">
          {isSuccess ? (
            <div className="auth-shell__center">
              <MaterialIcon name="mark_email_read" size={48} className="text-primary" />
              <h1 className="auth-shell__title">Check your email</h1>
              <p className="auth-shell__sub">
                We've sent a reset link to <strong>{(resetEmail || email).trim()}</strong>.
                It expires in 60 minutes.
              </p>
              <button type="button" className="btn btn-secondary auth-shell__back" onClick={() => setView('login')}>
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="auth-shell__form">
              <button
                type="button"
                className="auth-shell__back-link"
                onClick={() => { setView('login'); setError(null) }}
              >
                <MaterialIcon name="arrow_back" size={18} /> Back to sign in
              </button>
              <h1 className="auth-shell__title">Reset your password</h1>
              <p className="auth-shell__sub">Enter your email and we'll send you a reset link.</p>

              <label className="auth-shell__label" htmlFor="reset-email">Email address</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                className="auth-shell__input"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />

              {error && (
                <div className="auth-shell__error">
                  <MaterialIcon name="error_outline" size={18} /> {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary auth-shell__submit" disabled={loading}>
                {loading ? <MaterialIcon name="refresh" className="spinner" size={20} /> : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-shell__split auth-shell__split--login">
        {/* Brand panel — login: returning-user proof */}
        <aside className="auth-shell__brand auth-shell__brand--login">
          <Link to="/" className="auth-shell__logo" aria-label="Halaq home">
            <Logo size={28} color="#ffffff" title="Halaq" />
            <span>Halaq</span>
          </Link>

          <div className="auth-shell__brand-body">
            <span className="auth-shell__brand-eyebrow">Welcome back</span>
            <h2 className="auth-shell__hero">Pick up where you left off.</h2>
            <p className="auth-shell__hero-sub">
              Your watchlist, alerts, and methodology preferences are exactly where
              you parked them.
            </p>
          </div>

          <div className="auth-shell__highlight">
            <MaterialIcon name="bookmarks" fill size={20} />
            <div>
              <strong>Watchlist · live prices</strong>
              <span>Compliance and last price refresh every minute.</span>
            </div>
          </div>
          <div className="auth-shell__highlight">
            <MaterialIcon name="notifications_active" fill size={20} />
            <div>
              <strong>Status alerts</strong>
              <span>Be the first to know if a holding flips compliance.</span>
            </div>
          </div>
          <div className="auth-shell__highlight">
            <MaterialIcon name="lock" fill size={20} />
            <div>
              <strong>Privacy-first</strong>
              <span>We never sell your data. Your screens stay yours.</span>
            </div>
          </div>
        </aside>

        <div className="auth-shell__panel auth-shell__panel--locked">
          <div className="auth-shell__panel-inner">
            <header className="auth-shell__mobile-header">
              <Link to="/" className="auth-shell__back-link">
                <MaterialIcon name="arrow_back" size={20} /> Home
              </Link>
              <span className="auth-shell__mobile-title">Sign in</span>
            </header>

            <h1 className="auth-shell__title">Sign in</h1>
            <p className="auth-shell__sub">Welcome back to Halaq.</p>

            <form onSubmit={handleSubmit} className="auth-shell__form">
              {error && (
                <div className="auth-shell__error" role="alert">
                  <MaterialIcon name="error_outline" size={18} /> {error}
                </div>
              )}

              <label className="auth-shell__label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className="auth-shell__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />

              <div className="auth-shell__label-row">
                <label className="auth-shell__label" htmlFor="login-password">Password</label>
                <button
                  type="button"
                  className="auth-shell__forgot"
                  onClick={() => { setView('forgot'); setResetEmail(email) }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="auth-shell__password">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="auth-shell__input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="auth-shell__eye"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(p => !p)}
                >
                  <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>

              <button type="submit" className="btn btn-primary auth-shell__submit" disabled={loading}>
                {loading ? <MaterialIcon name="refresh" className="spinner" size={20} /> : 'Sign in'}
              </button>
            </form>

            <div className="auth-shell__divider">
              <span>or continue with</span>
            </div>

            <div className="auth-shell__oauth">
              <button
                type="button"
                className="auth-shell__oauth-btn"
                onClick={() => handleOAuth('google')}
                disabled={!!oauthLoading}
              >
                {oauthLoading === 'google' ? (
                  <MaterialIcon name="refresh" className="spinner" size={18} />
                ) : (
                  <GoogleMark />
                )}
                Google
              </button>
              <button
                type="button"
                className="auth-shell__oauth-btn"
                onClick={() => handleOAuth('apple')}
                disabled={!!oauthLoading}
              >
                {oauthLoading === 'apple' ? (
                  <MaterialIcon name="refresh" className="spinner" size={18} />
                ) : (
                  <AppleMark />
                )}
                Apple
              </button>
            </div>

            <p className="auth-shell__footer">
              New to Halaq?{' '}
              <Link to="/signup" className="text-primary auth-shell__cta">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}
