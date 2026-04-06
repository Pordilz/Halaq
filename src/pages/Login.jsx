import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { KeyRound, Mail, AlertTriangle, Loader2 } from 'lucide-react'
import './Auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const redirect = params.get('redirect') || '/dashboard'
      navigate(redirect)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card card card-elevated animate-fade-in-up">
        <h2>Welcome Back</h2>
        <p className="text-muted">Sign in to track your Shariah-compliant portfolio.</p>
        
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
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <Loader2 size={18} className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
