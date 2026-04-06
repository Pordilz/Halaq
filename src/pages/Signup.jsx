import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { KeyRound, Mail, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import './Auth.css'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data?.user && !data.session) {
      setSuccess(true)
      setLoading(false)
    } else {
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect') || '/dashboard'
      navigate(redirect)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card card card-elevated animate-fade-in-up" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <CheckCircle2 size={48} color="var(--color-primary)" style={{ margin: '0 auto 1rem' }} />
          <h2>Account Created!</h2>
          <p className="text-muted" style={{ margin: '1rem 0 2rem' }}>
            We've sent a confirmation link to <strong>{email}</strong>. Please check your inbox and confirm your email address before logging in.
          </p>
          <Link to="/login" className="btn btn-primary btn-block">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card card card-elevated animate-fade-in-up">
        <h2>Create Account</h2>
        <p className="text-muted">Join Halaq to build your Shariah-compliant portfolio.</p>
        
        {error && (
          <div className="auth-error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input 
                type="email" 
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
              <KeyRound size={18} className="input-icon" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Confirm Password</label>
            <div className="input-wrapper">
              <KeyRound size={18} className="input-icon" />
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <Loader2 size={18} className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
