import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { createCheckoutSession } from '../services/halaqApi'
import MaterialIcon from '../components/MaterialIcon'
import './Upgrade.css'

// What each tier actually unlocks in the code: Pro and Scholar share
// isPro (AuthContext), so both get every Pro feature.
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    lines: [
      '50 screens a day, 10 without an account',
      'AAOIFI verdicts for any listed stock',
      'A watchlist, re-screened every day',
      'Verify for saved stocks that need a second look',
    ],
    cta: 'Create an account',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    cadence: 'a month',
    lines: [
      'Unlimited screens',
      'The full ratio and business breakdown',
      'Purification calculator',
      'Any of AAOIFI, S&P, Dow Jones and FTSE',
      'Batch screening, up to 20 tickers',
      'ETF X-Ray',
    ],
    cta: 'Choose Pro',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    price: '$29',
    cadence: 'a month',
    lines: ['For advisers who screen for others.', 'Everything in Pro, with priority email support.'],
    cta: 'Choose Scholar',
  },
]

export default function Upgrade() {
  const { user, tier } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const focusedTier = params.get('tier')
  const [loadingTier, setLoadingTier] = useState(null)
  const [error, setError] = useState(null)

  async function handleUpgrade(planId) {
    if (!user) {
      navigate(`/login?redirect=/upgrade`)
      return
    }
    if (planId === 'free') return
    setLoadingTier(planId)
    setError(null)
    try {
      await createCheckoutSession(planId)
    } catch (err) {
      setError(err.message || 'Could not start checkout')
      setLoadingTier(null)
    }
  }

  return (
    <div className="upgrade-page container animate-entrance">
      <header className="upgrade-page__header">
        <h1 className="upgrade-page__title">Free, or $9 a month</h1>
        <p className="upgrade-page__lead">
          Start free. Pro adds every standard, the full breakdown, and the tools for funds and long
          lists. Cancel any time.
        </p>
      </header>

      {error && (
        <div className="upgrade-page__error" role="alert">
          <MaterialIcon name="error_outline" size={18} /> {error}
        </div>
      )}

      <div className="upgrade-page__plans">
        {PLANS.map((plan, i) => {
          // tier defaults to 'free' before sign-in, so only a signed-in user has a current plan.
          const isCurrent = !!user && (tier || 'free') === plan.id
          return (
            <article
              key={plan.id}
              className={`plan-tile plan-tile--${i}${focusedTier === plan.id ? ' is-focused' : ''}`}
            >
              <h2 className="plan-tile__name">{plan.name}</h2>
              <p className="plan-tile__price">
                {plan.price}
                {plan.cadence && <span> {plan.cadence}</span>}
              </p>
              <ul className="plan-tile__lines">
                {plan.lines.map(line => <li key={line}>{line}</li>)}
              </ul>
              <button
                type="button"
                className="plan-tile__action"
                disabled={isCurrent || loadingTier === plan.id}
                onClick={() => (plan.id === 'free' ? navigate(user ? '/screener' : '/signup') : handleUpgrade(plan.id))}
              >
                {loadingTier === plan.id ? 'Opening checkout…' : isCurrent ? 'Your current plan' : plan.cta}
              </button>
            </article>
          )
        })}
      </div>

      <section className="upgrade-page__terms" aria-label="Billing">
        <div>
          <h2>Cancelling</h2>
          <p>
            Paid plans renew each month until you cancel. Cancel from Profile at any time and you keep
            access to the end of the month you paid for.
          </p>
        </div>
        <div>
          <h2>Refunds</h2>
          <p>
            New subscribers can ask for a full refund within 14 days of their first payment by
            emailing <a href="mailto:qromatech@gmail.com">qromatech@gmail.com</a>.
          </p>
        </div>
        <div>
          <h2>Billing</h2>
          <p>Payments are handled by Lemon Squeezy, in US dollars, with VAT or sales tax included where it applies.</p>
        </div>
      </section>
    </div>
  )
}
