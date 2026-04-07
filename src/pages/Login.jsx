import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from '../components/MaterialIcon'
import './Auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect') || '/screener'
      navigate(redirect)
    }
  }

  return (
    <div className="auth-page">
      <div className="ambient-glow-mint" />
      <div className="ambient-glow-gold" />
      
      <header className="auth-header">
        <Link to="/" className="logo">
          <img src="/favicon.svg" alt="Halaq Logo" style={{ width: 24, height: 24 }} />
          <span className="logo-text">Halaq</span>
        </Link>
      </header>

      <div className="auth-content animate-entrance">
        {/* Mobile Titles */}
        <div className="auth-titles block lg:hidden">
          <h1>Welcome Back</h1>
          <p>Sign in to continue to Halaq.</p>
        </div>

        <div className="desktop-auth-container">
          {/* Desktop Brand Panel */}
          <div className="brand-panel" style={{ background: 'linear-gradient(135deg, var(--color-surface-container-high) 0%, var(--color-surface-container) 100%)' }}>
            <div className="brand-panel-logo" style={{ color: 'var(--color-primary)' }}>
              <img src="/favicon.svg" alt="Halaq Logo" style={{ width: 28, height: 28 }} />
              <span className="text-xl font-display tracking-tight">Halaq</span>
            </div>
            
            <div>
              <div className="brand-panel-quote" style={{ color: 'var(--color-on-surface)' }}>"Your Halal portfolio,<br/>simplified."</div>
              <div className="brand-bullets block mt-6">
                <div className="brand-bullet" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Screen 10,000+ global stocks
                </div>
                <div className="brand-bullet" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Save to your watchlist
                </div>
              </div>
            </div>
          </div>

          {/* Form Panel */}
          <div className="auth-card">
            {/* Desktop Titles */}
            <div className="desktop-auth-titles hidden lg:block">
              <h1>Welcome Back</h1>
              <p>Sign in to continue to Halaq.</p>
            </div>

            {error && (
              <div className="auth-error-banner animate-entrance">
                <MaterialIcon name="error" fill size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <MaterialIcon name="mail" className="input-icon" size={20} />
                  <input 
                    type="email" 
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required 
                  />
                </div>
              </div>
              
              <div className="form-group">
                <div className="flex-between w-full">
                  <label>Password</label>
                  <a href="#" className="text-primary text-body-sm font-heading">Forgot?</a>
                </div>
                <div className="input-wrapper">
                  <MaterialIcon name="key" className="input-icon" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <MaterialIcon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                  </button>
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
                {loading ? <MaterialIcon name="refresh" className="spinner" size={20} /> : 'Log In'}
              </button>
            </form>

            <div className="divider-row">or log in with</div>

            <div className="oauth-row mt-4">
              <button type="button" className="btn btn-secondary w-full" aria-label="Log in with Google">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" style={{width: 24, height: 24}}/>
              </button>
              <button type="button" className="btn btn-secondary w-full" aria-label="Log in with Apple">
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" style={{width: 24, height: 24, opacity: 0.8}}/>
              </button>
            </div>

            <p className="auth-footer">
              Don't have an account? <Link to="/signup">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
