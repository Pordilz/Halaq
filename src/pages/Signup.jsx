import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from '../components/MaterialIcon'
import './Auth.css'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    
    const { data, error } = await signUp(email, password)
    // In a real app we'd also store fullName in the profiles table via Supabase Auth metadata or post-signup trigger
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data?.user && !data.session) {
      setSuccess(true)
      setLoading(false)
    } else {
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect') || '/screener'
      navigate(redirect)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="ambient-glow-mint" />
        <div className="ambient-glow-gold" />
        <div className="auth-content">
          <div className="auth-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <MaterialIcon name="check_circle" fill className="text-tertiary" size={48} style={{ margin: '0 auto 1rem' }} />
            <h2 className="text-h2 font-heading">Account Created!</h2>
            <p className="text-on-surface-variant my-4">
              We've sent a confirmation link to <strong className="text-on-surface">{email}</strong>. Please check your inbox and confirm your email address before logging in.
            </p>
            <Link to="/login" className="btn btn-primary w-full mt-6">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
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
          <h1>Create Your Account</h1>
          <p>Join thousands of Muslim investors.</p>
        </div>

        <div className="desktop-auth-container">
          {/* Desktop Brand Panel */}
          <div className="brand-panel">
            <div className="brand-panel-logo">
              <img src="/favicon.svg" alt="Halaq Logo" style={{ width: 28, height: 28 }} />
              <span className="text-xl font-display tracking-tight">Halaq</span>
            </div>
            
            <div>
              <div className="brand-panel-quote">"Clarity for the conscience.<br/>Confidence for the investor."</div>
              <div className="brand-bullets">
                <div className="brand-bullet">
                  <MaterialIcon name="check_circle" fill /> AAOIFI-aligned screening
                </div>
                <div className="brand-bullet">
                  <MaterialIcon name="check_circle" fill /> 10,000+ global stocks
                </div>
                <div className="brand-bullet">
                  <MaterialIcon name="check_circle" fill /> Free forever options
                </div>
              </div>
            </div>
          </div>

          {/* Form Panel */}
          <div className="auth-card">
            {/* Desktop Titles */}
            <div className="desktop-auth-titles hidden lg:block">
              <h1>Create Your Account</h1>
              <p>Join thousands of Muslim investors.</p>
            </div>

            {error && (
              <div className="auth-error-banner animate-entrance">
                <MaterialIcon name="error" fill size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <MaterialIcon name="person" className="input-icon" size={20} />
                  <input 
                    type="text" 
                    className="input-field"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required 
                  />
                </div>
              </div>

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
                <label>Password</label>
                <div className="input-wrapper">
                  <MaterialIcon name="key" className="input-icon" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
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
              
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <MaterialIcon name="key" className="input-icon" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="input-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="checkbox-row">
                <input type="checkbox" id="terms" required />
                <label htmlFor="terms">
                  I agree to the <a href="#" className="text-primary font-bold">Privacy Policy</a> and <a href="#" className="text-primary font-bold">Terms of Use</a>.
                </label>
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
                {loading ? <MaterialIcon name="refresh" className="spinner" size={20} /> : 'Create Account'}
              </button>
            </form>

            <div className="divider-row">or sign up with</div>

            <div className="oauth-row mt-4">
              <button type="button" className="btn btn-secondary w-full" aria-label="Sign up with Google">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" style={{width: 24, height: 24}}/>
              </button>
              <button type="button" className="btn btn-secondary w-full" aria-label="Sign up with Apple">
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" style={{width: 24, height: 24, opacity: 0.8}}/>
              </button>
            </div>

            <p className="auth-footer">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
