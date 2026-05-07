import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { openBillingPortal } from '../services/halaqApi'
import MaterialIcon from '../components/MaterialIcon'
import './Profile.css'

const METHODOLOGY_OPTIONS = [
  { value: 'AAOIFI', label: 'AAOIFI' },
  { value: 'DJIM', label: 'Dow Jones Islamic (Pro)' },
  { value: 'SP', label: 'S&P Shariah (Pro)' },
  { value: 'FTSE', label: 'FTSE Shariah (Pro)' },
]

export default function Profile() {
  const { user, profile, signOut, refreshProfile, isPro, tier } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [notifications, setNotifications] = useState(profile?.alerts_enabled || false)
  const [methodology, setMethodology] = useState(profile?.methodology || 'AAOIFI')
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState(null)
  const [confirmSignout, setConfirmSignout] = useState(false)

  useEffect(() => {
    if (profile) {
      setNotifications(!!profile.alerts_enabled)
      if (profile.methodology) setMethodology(profile.methodology)
    }
  }, [profile])

  // After webhook flips tier=pro, reload the profile
  useEffect(() => {
    if (params.get('upgrade') === 'success') {
      refreshProfile()
    }
  }, [params, refreshProfile])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const initials = (profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()
  const fullName = profile?.full_name || user?.email?.split('@')[0] || 'Halaq Investor'
  const email = profile?.email || user?.email

  async function toggleAlerts() {
    if (!user) return
    const next = !notifications
    setNotifications(next)
    if (supabase.isConfigured) {
      const { error } = await supabase
        .from('profiles')
        .update({ alerts_enabled: next })
        .eq('id', user.id)
      if (error) setNotifications(!next)
    }
  }

  async function handleBilling() {
    setBillingLoading(true)
    setBillingError(null)
    try {
      await openBillingPortal()
    } catch (err) {
      setBillingError(err.message || 'Could not open billing portal')
      setBillingLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <h2 className="text-h2">Sign in to view your profile</h2>
        <button className="btn btn-primary mt-6 mx-auto" onClick={() => navigate('/login')}>Log In</button>
      </div>
    )
  }

  return (
    <div className="profile-page container animate-entrance">
      <div className="profile-header mb-8 mt-4">
        <h1 className="text-h1 mb-2">Profile & settings</h1>
        <p className="text-on-surface-variant text-body-lg">
          Manage your account, methodology and notification preferences.
        </p>
      </div>

      {params.get('upgrade') === 'success' && (
        <div className="profile-banner profile-banner--success" role="status">
          <MaterialIcon name="check_circle" fill /> Upgrade complete — welcome aboard.
        </div>
      )}

      <div className="profile-layout">

        <div className="profile-sidebar">
          <div className="user-card card-standard">
            <div className="user-avatar" aria-hidden>{initials}</div>
            <h2 className="text-h2 mt-4 truncate" title={fullName}>{fullName}</h2>
            <p className="text-on-surface-variant text-body-sm truncate" title={email}>{email}</p>

            <div className="tier-badge mt-4">
              <MaterialIcon name={isPro ? 'workspace_premium' : 'account_circle'} size={18} />
              <span>Plan: <strong>{tier.toUpperCase()}</strong></span>
            </div>

            {!isPro && (
              <button className="btn btn-primary w-full mt-6" onClick={() => navigate('/upgrade')}>
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>

        <div className="profile-main">

          <section className="settings-section">
            <h3 className="section-title">Screening preferences</h3>
            <div className="settings-card">
              <div className="settings-row">
                <div className="settings-info">
                  <div className="settings-label">Default methodology</div>
                  <div className="settings-desc">Which standard governs your compliance rules.</div>
                </div>
                <select
                  className="settings-select"
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  disabled={!isPro && methodology !== 'AAOIFI'}
                >
                  {METHODOLOGY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} disabled={!isPro && opt.value !== 'AAOIFI'}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {!isPro && (
                <div className="premium-upsell">
                  <MaterialIcon name="lock" size={14} className="text-primary" />
                  <span>Multiple methodologies are a Pro feature.</span>
                </div>
              )}
            </div>
          </section>

          <section className="settings-section">
            <h3 className="section-title">Notifications</h3>
            <div className="settings-card">
              <div className="settings-row">
                <div className="settings-info">
                  <div className="settings-label">Compliance change alerts</div>
                  <div className="settings-desc">Email me when a stock in my watchlist changes status.</div>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${notifications ? 'active' : ''}`}
                  role="switch"
                  aria-checked={notifications}
                  onClick={toggleAlerts}
                >
                  <span className="toggle-slider" />
                </button>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="section-title">Account</h3>
            <div className="settings-card">
              <button
                type="button"
                className="settings-link-btn"
                onClick={isPro ? handleBilling : () => navigate('/upgrade')}
                disabled={billingLoading}
              >
                <span className="flex-row gap-3">
                  <MaterialIcon name="payment" size={20} className="text-on-surface-variant" />
                  <span>{isPro ? 'Manage subscription & billing' : 'Choose a plan'}</span>
                </span>
                {billingLoading
                  ? <MaterialIcon name="refresh" className="spinner text-outline" size={18} />
                  : <MaterialIcon name="chevron_right" className="text-outline" />}
              </button>
              {billingError && (
                <div className="profile-banner profile-banner--error" role="alert">
                  <MaterialIcon name="error_outline" size={18} /> {billingError}
                </div>
              )}
              <button
                type="button"
                className={`settings-link-btn ${confirmSignout ? 'is-confirming' : ''}`}
                onClick={confirmSignout ? handleSignOut : () => setConfirmSignout(true)}
                onBlur={() => setConfirmSignout(false)}
              >
                <span className="flex-row gap-3">
                  <MaterialIcon
                    name="logout"
                    size={20}
                    className={confirmSignout ? 'text-on-error-container' : 'text-error'}
                  />
                  <span className={confirmSignout ? '' : 'text-error'}>
                    {confirmSignout ? 'Click again to confirm sign out' : 'Sign out'}
                  </span>
                </span>
              </button>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="section-title">How we determine halal</h3>
            <div className="methodology-card">
              <p className="methodology-card__intro">
                Every Halaq verdict comes from two screens applied in order — the first
                qualitative, the second quantitative.
              </p>

              <ol className="methodology-card__list">
                <li>
                  <span className="methodology-card__step">01</span>
                  <div>
                    <strong>Business activity (qualitative)</strong>
                    <span>
                      Companies whose primary line of business is in conventional banking,
                      insurance, alcohol, gambling, tobacco, adult entertainment, pork or
                      non-halal meat are non-permissible. Mixed sectors (hotels, retail,
                      media) pass only if non-permissible revenue is below 5%.
                    </span>
                  </div>
                </li>
                <li>
                  <span className="methodology-card__step">02</span>
                  <div>
                    <strong>Financial ratios (quantitative)</strong>
                    <span>
                      Four AAOIFI ratios computed from the latest annual report:
                      total debt ÷ market cap (&lt;33%), cash + interest-bearing securities ÷
                      market cap (&lt;33%), receivables ÷ market cap (&lt;49%), and
                      (interest income + interest expense) ÷ revenue (&lt;5%).
                    </span>
                  </div>
                </li>
              </ol>

              <div className="methodology-card__peers">
                <strong>Peer-reviewed against</strong>
                <span>
                  We sanity-check every benchmark verdict against Zoya, Musaffa, Islamicly
                  and Wahed Invest. Discrepancies are treated as bugs.
                </span>
              </div>

              <a href="https://aaoifi.com/shariaa-standards/?lang=en" target="_blank" rel="noreferrer" className="methodology-card__source">
                <MaterialIcon name="open_in_new" size={14} />
                AAOIFI Shariah Standard 21 (primary source)
              </a>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="section-title">About Halaq</h3>
            <div className="settings-card">
              <div className="about-card">
                <p className="text-on-surface-variant text-body-sm">
                  Version 1.0 · Beta
                </p>
                <div className="about-card__links">
                  <a href="/legal/terms">Terms of Use</a>
                  <a href="/legal/privacy">Privacy Policy</a>
                  <a href="mailto:support@halaq.app">Contact support</a>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
