import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from '../components/MaterialIcon'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showError, setShowError] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!agreed) {
      setShowError(true)
      return
    }
    
    setLoading(true)
    setError(null)
    
    const { data, error } = await signUp(email, password)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/screener', { state: { showSetup: true }, replace: true })
    }
  }

  const formContent = (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', position: 'relative' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginLeft: '0.25rem' }}>Full Name</label>
          <input 
            type="text" 
            style={{ width: '100%', height: '3.5rem', padding: '0 1.25rem', backgroundColor: '#dde6f3', borderRadius: '1rem', fontSize: '1rem', fontFamily: 'inherit', color: 'var(--color-on-surface)', outline: 'none', border: '1px solid transparent', transition: 'all 0.2s' }}
            onFocus={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.borderColor = 'var(--color-primary)' }}
            onBlur={(e) => { e.target.style.backgroundColor = '#dde6f3'; e.target.style.borderColor = 'transparent' }}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your name"
            required 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', position: 'relative' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginLeft: '0.25rem' }}>Email Address</label>
          <input 
            type="email" 
            style={{ width: '100%', height: '3.5rem', padding: '0 1.25rem', backgroundColor: '#dde6f3', borderRadius: '1rem', fontSize: '1rem', fontFamily: 'inherit', color: 'var(--color-on-surface)', outline: 'none', border: '1px solid transparent', transition: 'all 0.2s' }}
            onFocus={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.borderColor = 'var(--color-primary)' }}
            onBlur={(e) => { e.target.style.backgroundColor = '#dde6f3'; e.target.style.borderColor = 'transparent' }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required 
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', position: 'relative' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginLeft: '0.25rem' }}>Create Password</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              style={{ width: '100%', height: '3.5rem', padding: '0 1.25rem', backgroundColor: '#dde6f3', borderRadius: '1rem', fontSize: '1rem', fontFamily: 'inherit', color: 'var(--color-on-surface)', outline: 'none', border: '1px solid transparent', transition: 'all 0.2s' }}
              onFocus={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.borderColor = 'var(--color-primary)' }}
              onBlur={(e) => { e.target.style.backgroundColor = '#dde6f3'; e.target.style.borderColor = 'transparent' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
            />
            <button 
              type="button" 
              style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onClick={() => setShowPassword(!showPassword)}
            >
              <MaterialIcon name={showPassword ? "visibility_off" : "visibility"} size={20} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '0.5rem', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <input 
              type="checkbox" 
              style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--color-primary)', marginTop: '0.125rem', borderRadius: '0.25rem' }}
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                setShowError(false);
              }}
            />
            <label style={{ fontSize: '0.875rem', color: showError ? 'var(--color-error)' : 'var(--color-on-surface-variant)', fontWeight: showError ? 700 : 400 }}>
              I agree to the <a href="#" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>Privacy Policy</a> and <a href="#" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>Terms of Use</a>
              {showError && <div style={{ display: 'block', marginTop: '0.25rem', fontWeight: 700 }}>Required — please accept to continue</div>}
            </label>
          </div>
        </div>

        <div style={{ backgroundColor: 'rgba(254, 243, 199, 0.4)', padding: '0.75rem', borderRadius: '0.75rem', display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-on-caution-container)', fontWeight: 500 }}>ⓘ Halaq provides general guidance only. Not a fatwa. Not financial advice.</span>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container" style={{ padding: '1rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <MaterialIcon name="error_outline" size={18} /> {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '3.5rem', marginTop: '1rem', borderRadius: '1rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #1a6b47 0%, #22875a 100%)', color: 'white', fontWeight: 700, transition: 'transform 0.15s' }} disabled={loading}>
          {loading ? <MaterialIcon name="refresh" className="spinner" size={24} /> : 'Create Account'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
        <div style={{ height: '1px', backgroundColor: 'var(--color-surface-container-high)', flex: 1 }} />
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-outline-variant)' }}>Or Continue With</div>
        <div style={{ height: '1px', backgroundColor: 'var(--color-surface-container-high)', flex: 1 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <button type="button" style={{ height: '3rem', borderRadius: '1rem', backgroundColor: 'var(--color-surface-low)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google
        </button>
        <button type="button" style={{ height: '3rem', borderRadius: '1rem', backgroundColor: 'var(--color-surface-low)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          Apple
        </button>
      </div>

      <div style={{ fontSize: '0.875rem', marginTop: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 800, textDecoration: 'none' }}>Sign In</Link>
      </div>
    </>
  );

  return (
    <div className="bg-surface" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Glow Orbs */}
      <div style={{ position: 'fixed', bottom: '-10%', right: '-5%', width: '350px', height: '350px', borderRadius: '50%', filter: 'blur(90px)', zIndex: -10, backgroundColor: 'rgba(163, 240, 202, 0.18)', animation: 'glowPulse 7s infinite' }} />
      <div style={{ position: 'fixed', top: '15%', left: '-10%', width: '280px', height: '280px', borderRadius: '50%', filter: 'blur(70px)', zIndex: -10, backgroundColor: 'rgba(255, 231, 146, 0.12)', animation: 'glowPulse 9s infinite 3s' }} />


      <div className="animate-scale-in card-standard" style={{ display: 'none', width: '100%', maxWidth: '960px', backgroundColor: 'white', borderRadius: '1.5rem', boxShadow: 'var(--shadow-floating)', overflow: 'hidden', animation: 'scaleIn 0.5s ease 0.1s both', zIndex: 10, '@media (minWidth: 768px)': { display: 'flex' } }}>
        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 768px) {
            .desktop-auth-container { display: flex !important; }
            .mobile-auth-container { display: none !important; }
          }
          @media (max-width: 767px) {
            .desktop-auth-container { display: none !important; }
            .mobile-auth-container { display: flex !important; }
          }
        `}} />
      </div>

      {/* Actual Desktop Shell */}
      <div className="desktop-auth-container animate-scale-in" style={{ display: 'none', width: '100%', maxWidth: '960px', backgroundColor: 'white', borderRadius: '1.5rem', boxShadow: 'var(--shadow-floating)', overflow: 'hidden', animation: 'scaleIn 0.5s ease 0.1s both', zIndex: 10 }}>
        
        {/* Left Brand Panel */}
        <div style={{ width: '40%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3.5rem', position: 'relative', background: 'linear-gradient(160deg, #1a6b47 0%, #22875a 100%)', minHeight: '560px' }}>
           <div style={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle at 10% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
           
           <div style={{ position: 'relative', zIndex: 10 }}>
             <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4rem', textDecoration: 'none', width: 'max-content' }}>
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white"/></svg>
               <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'white', letterSpacing: '-0.025em' }}>Halaq</span>
             </Link>

             <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.95)', lineHeight: 1.25 }}>Invest with a clear conscience.</h2>
             <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.75rem' }}>Shariah stock screening, free and principled.</p>
           </div>

           <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 'auto' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><MaterialIcon name="check_circle" fill className="text-white" size={18} /> <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>10,000+ global stocks screened</span></div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><MaterialIcon name="check_circle" fill className="text-white" size={18} /> <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>AAOIFI and major scholarly standards</span></div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><MaterialIcon name="check_circle" fill className="text-white" size={18} /> <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>100% free. No data sold.</span></div>
           </div>
        </div>

        {/* Right Form Panel */}
        <div style={{ width: '60%', backgroundColor: 'var(--color-surface-lowest)', padding: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
           <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>Begin Your<br/><span className="text-primary">Halal Journey.</span></h1>
           <p style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', marginBottom: '2rem' }}>Join Muslim investors screening stocks with clarity and conscience.</p>
           {formContent}
        </div>
      </div>

      <div className="mobile-auth-container animate-entrance delay-100" style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header className="glass-panel" style={{ height: '4rem', display: 'flex', alignItems: 'center', padding: '0 1rem', width: '100%', borderBottom: '1px solid var(--color-surface-container-low)', position: 'relative' }}>
          <Link to="/" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}><MaterialIcon name="arrow_back" size={24} /></Link>
          <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-primary)', letterSpacing: '-0.025em', marginLeft: '0.5rem' }}>Sign Up</span>
        </header>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem 3rem 1.5rem', width: '100%', maxWidth: '28rem', margin: '0 auto' }}>
          <div className="animate-entrance delay-100" style={{ width: '100%' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>Begin Your<br/><span className="text-primary">Halal Journey.</span></h1>
            <p style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-on-surface-variant)', opacity: 0.8, maxWidth: '280px', lineHeight: 1.6 }}>Join Muslim investors screening stocks with clarity and conscience.</p>
          </div>

          <div className="animate-entrance delay-200 shadow-standard" style={{ width: '100%', backgroundColor: 'white', borderRadius: '1.5rem', padding: '2rem', marginTop: '2rem' }}>
             {formContent}
          </div>
        </div>
      </div>
    </div>
  )
}
