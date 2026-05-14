import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createCheckoutSession } from '../services/halaqApi'
import MaterialIcon from '../components/MaterialIcon'
import './Upgrade.css'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start screening today',
    price: '$0',
    cadence: 'forever',
    features: [
      '50 stock screens per day',
      'Basic compliance ruling',
      'Save up to 20 watchlist stocks',
      'AAOIFI methodology',
    ],
    cta: 'Current plan',
    disabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For active investors',
    price: '$9',
    cadence: '/month',
    highlighted: true,
    features: [
      'Unlimited stock screens',
      'Full ratio breakdown & purification math',
      'Batch screening (up to 20 tickers)',
      'PDF compliance reports',
      'Email alerts on compliance changes',
    ],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    tagline: 'For advisers & professionals',
    price: '$29',
    cadence: '/month',
    features: [
      'Everything in Pro',
      'Multiple methodologies (AAOIFI, DJIM, S&P, FTSE)',
      'ETF X-Ray (when released)',
      'AI Shariah companion (when released)',
      'Priority email support',
    ],
    cta: 'Upgrade to Scholar',
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
        <h1 className="text-h1 mb-2">Pick the plan that fits you</h1>
        <p className="text-on-surface-variant text-body-lg">
          Start free. Upgrade only when you need deeper insight or batch tools. Cancel anytime.
        </p>
      </header>

      {error && (
        <div className="upgrade-page__error" role="alert">
          <MaterialIcon name="error_outline" size={18} /> {error}
        </div>
      )}

      <div className="upgrade-page__grid">
        {PLANS.map((plan) => {
          const isCurrent = tier === plan.id
          const isFocused = focusedTier === plan.id
          return (
            <article
              key={plan.id}
              className={[
                'plan-card card-standard',
                plan.highlighted ? 'plan-card--highlight' : '',
                isFocused ? 'plan-card--focused' : '',
              ].filter(Boolean).join(' ')}
            >
              {plan.highlighted && (
                <span className="plan-card__ribbon">Most popular</span>
              )}
              <header className="plan-card__head">
                <h2 className="plan-card__name">{plan.name}</h2>
                <p className="plan-card__tagline">{plan.tagline}</p>
              </header>
              <div className="plan-card__price">
                <span className="plan-card__amount">{plan.price}</span>
                <span className="plan-card__cadence">{plan.cadence}</span>
              </div>
              <ul className="plan-card__features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <MaterialIcon name="check_circle" fill size={18} className="text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-secondary'} plan-card__cta`}
                disabled={plan.disabled || isCurrent || loadingTier === plan.id}
                onClick={() => handleUpgrade(plan.id)}
              >
                {loadingTier === plan.id ? (
                  <MaterialIcon name="refresh" size={18} className="spinner" />
                ) : isCurrent ? (
                  'Current plan'
                ) : (
                  plan.cta
                )}
              </button>
            </article>
          )
        })}
      </div>

      <p className="upgrade-page__fineprint">
        Billing handled securely by Lemon Squeezy. VAT/sales tax included where applicable.
      </p>
    </div>
  )
}
