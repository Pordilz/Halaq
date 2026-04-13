import { useState, useEffect } from 'react'
import MaterialIcon from './MaterialIcon'

export default function SetupFlow({ onComplete }) {
  const [step, setStep] = useState(1)
  const [ticker, setTicker] = useState('')
  const [standard, setStandard] = useState('AAOIFI')
  const [isFinishing, setIsFinishing] = useState(false)

  const handleNext = () => {
    if (step === 1 && ticker.trim()) setStep(2);
    else if (step === 2) {
      setStep(3)
      // 2.0s forced celebration
      setTimeout(() => {
        setIsFinishing(true)
        setTimeout(() => {
          onComplete()
        }, 400) // fade out duration
      }, 2000)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleNext();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(248, 249, 251, 0.6)', backdropFilter: 'blur(12px)', transition: 'opacity 400ms ease', opacity: isFinishing ? 0 : 1, padding: 0 }}>
      {/* Media query overrides pushed directly or via matching behavior */}
      <div className="setup-modal-container animate-entrance shadow-standard" style={{ width: '100%', maxWidth: '440px', backgroundColor: 'white', borderTopLeftRadius: '2rem', borderTopRightRadius: '2rem', padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 768px) {
            .setup-modal-container { border-radius: 2rem !important; align-self: center !important; }
          }
        `}} />
        
        {step === 1 && (
          <div className="animate-entrance" style={{ width: '100%' }}>
            <div style={{ width: '4rem', height: '4rem', backgroundColor: 'var(--color-surface-container)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <MaterialIcon name="search" size={32} className="text-primary" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>Build your watchlist</h2>
            <p style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', marginBottom: '2rem' }}>What's the first stock you'd like to screen? (e.g., AAPL)</p>
            
            <input 
              type="text"
              autoFocus
              style={{ width: '100%', height: '3.5rem', padding: '0 1.5rem', backgroundColor: '#dde6f3', borderRadius: '1rem', fontSize: '1.125rem', fontWeight: 700, textAlign: 'center', color: 'var(--color-on-surface)', outline: 'none', border: '1px solid transparent', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)', marginBottom: '1rem', transition: 'all 0.2s' }}
              onFocus={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.borderColor = 'var(--color-primary)' }}
              onBlur={(e) => { e.target.style.backgroundColor = '#dde6f3'; e.target.style.borderColor = 'transparent' }}
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="ENTER TICKER"
            />
            
            <button 
              style={{ width: '100%', height: '52px', borderRadius: '9999px', color: 'white', fontWeight: 700, fontSize: '1rem', transition: 'all 0.15s', cursor: ticker.trim() ? 'pointer' : 'not-allowed', background: 'linear-gradient(135deg, #1a6b47 0%, #22875a 100%)', border: 'none', opacity: ticker.trim() ? 1 : 0.5 }}
              onClick={handleNext}
              disabled={!ticker.trim()}
            >
              Continue →
            </button>
            <button style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', marginTop: '1rem' }} onClick={() => setStep(2)}>Skip this step</button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-entrance" style={{ width: '100%' }}>
            <div style={{ width: '4rem', height: '4rem', backgroundColor: 'var(--color-surface-container)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <MaterialIcon name="menu_book" size={32} className="text-secondary" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>Your Standard</h2>
            <p style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>Halaq defaults to AAOIFI, the most widely cited scholarly standard.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', width: '100%' }}>
               {['AAOIFI', 'DJIM', 'S&P', 'FTSE'].map(std => (
                 <label key={std} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '1rem', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s', borderColor: standard === std ? 'var(--color-primary)' : 'var(--color-surface-container)', backgroundColor: standard === std ? 'rgba(163, 240, 202, 0.2)' : 'var(--color-surface-lowest)' }}>
                   <span style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>{std}</span>
                   <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: standard === std ? 'var(--color-primary)' : 'var(--color-outline-variant)', backgroundColor: standard === std ? 'var(--color-primary)' : 'transparent' }}>
                     {standard === std && <MaterialIcon name="check" size={16} className="text-white" />}
                   </div>
                   <input type="radio" style={{ display: 'none' }} name="standard" value={std} checked={standard === std} onChange={(e) => setStandard(e.target.value)} />
                 </label>
               ))}
            </div>

            <button 
              style={{ width: '100%', height: '52px', borderRadius: '9999px', color: 'white', fontWeight: 700, fontSize: '1rem', transition: 'all 0.15s', cursor: 'pointer', background: 'linear-gradient(135deg, #1a6b47 0%, #22875a 100%)', border: 'none' }}
              onClick={handleNext}
            >
              Finish Setup
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-entrance" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
            <MaterialIcon name="check_circle" fill className="text-tertiary glowPulse" size={80} style={{ animation: 'scaleSpring 0.6s ease-out forwards, glowPulse 2s infinite', marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>You're all set!</h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Redirecting to screener...</p>
          </div>
        )}

      </div>
    </div>
  )
}
