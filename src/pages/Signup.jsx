import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from '../components/MaterialIcon'
import Logo from '../components/Logo'
import { supabase } from '../lib/supabase'
import { normalizeUsername, validateUsername, USERNAME_MAX } from '../lib/username'
import './AuthShell.css'

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Strong']
  return { score: Math.min(score, 4), label: labels[Math.min(score, 5)] }
}

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showAgreedError, setShowAgreedError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [error, setError] = useState(null)
  const [emailVerifyNotice, setEmailVerifyNotice] = useState(false)

  const { signUp, signInWithProvider } = useAuth()
  const navigate = useNavigate()

  const strength = useMemo(() => passwordStrength(password), [password])
  const strengthClass = ['', 'is-weak', 'is-fair', 'is-good', 'is-strong'][strength.score]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!agreed) {
      setShowAgreedError(true)
      return
    }
    const usernameProblem = validateUsername(username)
    if (usernameProblem) {
      setUsernameError(usernameProblem)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    const cleanUsername = normalizeUsername(username)
    setLoading(true)
    setError(null)

    // Username availability check — uses a public RPC that bypasses
    // profile RLS and returns just a boolean.
    if (supabase.isConfigured) {
      const { data: taken, error: rpcError } = await supabase.rpc(
        'is_username_taken',
        { p_username: cleanUsername }
      )
      if (!rpcError && taken === true) {
        setUsernameError('That username is taken — try another.')
        setLoading(false)
        return
      }
    }

    const { data, error } = await signUp(email.trim(), password, {
      username: cleanUsername,
    })
    if (error) {
      // Common cases: existing email, weak password, network
      const friendly = /already registered|already exists/i.test(error.message)
        ? 'That email is already registered. Try signing in instead.'
        : error.message
      setError(friendly)
      setLoading(false)
      return
    }

    // Supabase's anti-enumeration response: when the email exists, it returns
    // a fake user with identities=[] and no session. Detect it and route the
    // user to login instead of stranding them on a "check your email" screen.
    const identities = data?.user?.identities
    const looksLikeRepeatedSignup =
      data?.user && Array.isArray(identities) && identities.length === 0
    if (looksLikeRepeatedSignup) {
      setLoading(false)
      setError('That email is already registered. Try signing in instead.')
      return
    }

    setLoading(false)
    if (data?.session) {
      navigate('/home', { replace: true })
      return
    }
    // Genuine new signup, awaiting email confirmation
    setEmailVerifyNotice(true)
  }

  async function handleOAuth(provider) {
    if (!agreed) {
      setShowAgreedError(true)
      return
    }
    setOauthLoading(provider)
    setError(null)
    const { error } = await signInWithProvider(provider)
    if (error) {
      setError(`${provider === 'google' ? 'Google' : 'Apple'} sign-up failed: ${error.message}`)
      setOauthLoading(null)
    }
  }

  if (emailVerifyNotice) {
    return (
      <div className="auth-shell">
        <div className="auth-shell__card">
          <div className="auth-shell__center">
            <MaterialIcon name="mark_email_read" size={48} className="text-primary" />
            <h1 className="auth-shell__title">Confirm your email</h1>
            <p className="auth-shell__sub">
              We sent a confirmation link to <strong>{email}</strong>. Click it
              to activate your account, then sign in.
            </p>
            <Link className="btn btn-primary auth-shell__back" to="/login">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-shell__split auth-shell__split--signup">
        {/* Brand panel — signup: outcome-focused proof */}
        <aside className="auth-shell__brand auth-shell__brand--signup">
          <Link to="/" className="auth-shell__logo" aria-label="Halaq home">
            <Logo size={28} color="#ffffff" title="Halaq" />
            <span>Halaq</span>
          </Link>

          <div className="auth-shell__brand-body">
            <span className="auth-shell__brand-eyebrow">Free forever</span>
            <h2 className="auth-shell__hero">Invest with a clear conscience.</h2>
            <p className="auth-shell__hero-sub">
              Halaq is the Shariah stock screener for Muslim investors who refuse
              to compromise — built on AAOIFI methodology and peer-reviewed
              against the leading Muslim investing apps.
            </p>
          </div>

          <ul className="auth-shell__bullets">
            <li>
              <span className="auth-shell__bullet-icon">
                <MaterialIcon name="check_circle" fill size={18} />
              </span>
              <div>
                <strong>10,000+ stocks screened</strong>
                <span>JSE & US equities, full ratio breakdowns.</span>
              </div>
            </li>
            <li>
              <span className="auth-shell__bullet-icon">
                <MaterialIcon name="check_circle" fill size={18} />
              </span>
              <div>
                <strong>AAOIFI · DJIM · S&amp;P · FTSE</strong>
                <span>Switch methodology to match your scholar.</span>
              </div>
            </li>
            <li>
              <span className="auth-shell__bullet-icon">
                <MaterialIcon name="check_circle" fill size={18} />
              </span>
              <div>
                <strong>Purification math, done</strong>
                <span>We compute the haram-revenue % per dividend.</span>
              </div>
            </li>
          </ul>

          <p className="auth-shell__brand-foot">No credit card. No data sold. No compromise.</p>
        </aside>

        <div className="auth-shell__panel auth-shell__panel--locked">
          <div className="auth-shell__panel-inner">
            <header className="auth-shell__mobile-header">
              <Link to="/" className="auth-shell__back-link">
                <MaterialIcon name="arrow_back" size={20} /> Home
              </Link>
              <span className="auth-shell__mobile-title">Create account</span>
            </header>

            <h1 className="auth-shell__title">Create account</h1>
            <p className="auth-shell__sub">Free forever — no credit card.</p>

            <form onSubmit={handleSubmit} className="auth-shell__form" noValidate>
              {error && (
                <div className="auth-shell__error" role="alert">
                  <MaterialIcon name="error_outline" size={18} /> {error}
                </div>
              )}

              <label className="auth-shell__label" htmlFor="signup-username">Username</label>
              <div className="auth-shell__input-with-prefix">
                <span className="auth-shell__input-prefix" aria-hidden="true">@</span>
                <input
                  id="signup-username"
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  spellCheck="false"
                  className={`auth-shell__input auth-shell__input--prefixed ${usernameError ? 'is-invalid' : ''}`}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    if (usernameError) setUsernameError(null)
                  }}
                  placeholder="halal_investor"
                  maxLength={USERNAME_MAX}
                  pattern="[a-z0-9_]{3,20}"
                  required
                />
              </div>
              {usernameError ? (
                <p className="auth-shell__field-error">{usernameError}</p>
              ) : (
                <p className="auth-shell__field-hint">
                  Public handle — letters, numbers and underscores. 3–{USERNAME_MAX} chars.
                </p>
              )}

              <label className="auth-shell__label" htmlFor="signup-email">Email address</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                className="auth-shell__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />

              <label className="auth-shell__label" htmlFor="signup-password">Password</label>
              <div className="auth-shell__password">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="auth-shell__input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
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

              {password && (
                <div className="auth-shell__strength" aria-live="polite">
                  <div className="auth-shell__strength-bars">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`auth-shell__strength-bar ${strength.score >= i ? strengthClass : ''}`}
                      />
                    ))}
                  </div>
                  <span className="auth-shell__strength-label">{strength.label}</span>
                </div>
              )}

              <label className={`auth-shell__terms ${showAgreedError && !agreed ? 'has-error' : ''}`}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => { setAgreed(e.target.checked); setShowAgreedError(false) }}
                />
                <span>
                  I agree to the{' '}
                  <a href="/legal/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>{' '}
                  and <a href="/legal/terms" target="_blank" rel="noreferrer">Terms of Use</a>.
                </span>
              </label>

              <button type="submit" className="btn btn-primary auth-shell__submit" disabled={loading}>
                {loading ? <MaterialIcon name="refresh" className="spinner" size={20} /> : 'Create account'}
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
              Already have an account?{' '}
              <Link to="/login" className="text-primary auth-shell__cta">Sign in</Link>
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
