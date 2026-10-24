import { useEffect, useRef, useState } from 'react'
import MaterialIcon from './MaterialIcon'
import './SetupFlow.css'

const TICKER_PATTERN = /^[A-Z0-9.-]{1,15}$/

/**
 * Post-signup welcome: pick a first stock (added to the watchlist and
 * opened), then a note on how Halaq screens. onComplete(ticker | null).
 */
export default function SetupFlow({ onComplete }) {
  const [step, setStep] = useState(1)
  const [ticker, setTicker] = useState('')
  const finishRef = useRef(null)
  const valid = TICKER_PATTERN.test(ticker)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onComplete(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onComplete])

  useEffect(() => {
    if (step === 2) finishRef.current?.focus()
  }, [step])

  function next(e) {
    e?.preventDefault()
    if (step === 1 && valid) setStep(2)
  }

  return (
    <div className="setup-flow">
      <div
        className="setup-flow__sheet card-standard animate-entrance"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-flow-title"
      >
        {step === 1 && (
          <form className="setup-flow__step" onSubmit={next}>
            <div className="setup-flow__icon">
              <MaterialIcon name="search" size={32} />
            </div>
            <h2 id="setup-flow-title" className="setup-flow__title">Build your watchlist</h2>
            <p className="setup-flow__body">
              What's the first stock you'd like to screen? We'll add it to your watchlist.
            </p>
            <label htmlFor="setup-flow-ticker" className="sr-only">Ticker</label>
            <input
              id="setup-flow-ticker"
              className="setup-flow__input"
              type="text"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase().trim())}
              placeholder="e.g. AAPL or NPN.JO"
            />
            <button type="submit" className="btn btn-primary setup-flow__cta" disabled={!valid}>
              Continue
            </button>
            <button type="button" className="setup-flow__skip" onClick={() => { setTicker(''); setStep(2) }}>
              Skip this step
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="setup-flow__step">
            <div className="setup-flow__icon setup-flow__icon--secondary">
              <MaterialIcon name="menu_book" size={32} />
            </div>
            <h2 id="setup-flow-title" className="setup-flow__title">How Halaq screens</h2>
            <p className="setup-flow__body">
              Every verdict uses AAOIFI Shari'ah Standard No. 21: the business must be permissible,
              debt and interest-bearing cash under 30% of market cap, and impermissible income
              under 5% of revenue. Pro members can switch to the S&amp;P, Dow Jones Islamic or FTSE
              methodologies in Settings.
            </p>
            <button
              ref={finishRef}
              type="button"
              className="btn btn-primary setup-flow__cta"
              onClick={() => onComplete(ticker || null)}
            >
              {ticker ? `Screen ${ticker}` : 'Start screening'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
