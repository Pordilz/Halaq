import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { openBillingPortal } from '../services/halaqApi'
import MaterialIcon from '../components/MaterialIcon'
import {
  displayName,
  displayInitials,
  normalizeUsername,
  validateUsername,
  USERNAME_MAX,
} from '../lib/username'
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

  // Username editor state
  const [usernameDraft, setUsernameDraft] = useState(profile?.username || '')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameError, setUsernameError] = useState(null)
  const [usernameSavedAt, setUsernameSavedAt] = useState(null)

  // Upgrade-confirmation lifecycle. The Lemon Squeezy webhook lands on the
  // server seconds *after* the user is redirected back here, so we poll
  // refreshProfile() until tier flips off 'free' (or a 30s budget expires).
  // 'pending'  → still polling, show "Confirming your upgrade…"
  // 'success'  → tier flipped, show the green banner
  // 'timeout'  → polled for 30s, no flip — direct user to email/support
  // null       → not in an upgrade flow
  const [upgradeState, setUpgradeState] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    if (profile) {
      setNotifications(!!profile.alerts_enabled)
      if (profile.methodology) setMethodology(profile.methodology)
      setUsernameDraft(profile.username || '')
    }
  }, [profile])

  // After webhook flips tier=pro, reload the profile. Poll because the
  // webhook is async — landing here with ?upgrade=success doesn't guarantee
  // the DB has been written yet.
  useEffect(() => {
    if (params.get('upgrade') !== 'success') return
    // If we already know the user is paid, jump straight to success.
    if (isPro) {
      setUpgradeState('success')
      return
    }
    setUpgradeState('pending')
    let attempts = 0
    const MAX_ATTEMPTS = 15 // 15 × 2s = 30s
    pollRef.current = setInterval(async () => {
      attempts += 1
      await refreshProfile()
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(pollRef.current)
        // Re-check tier via the latest profile (closure capture is stale —
        // setUpgradeState below reads from latest render via the next effect)
        setUpgradeState((s) => (s === 'pending' ? 'timeout' : s))
      }
    }, 2000)
    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  // When tier finally flips, clear the poll and show success.
  useEffect(() => {
    if (upgradeState === 'pending' && isPro) {
      clearInterval(pollRef.current)
      setUpgradeState('success')
    }
  }, [upgradeState, isPro])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const initials = displayInitials(profile, user)
  const headline = displayName(profile, user)
  const email = profile?.email || user?.email
  const usernameDirty = normalizeUsername(usernameDraft) !== (profile?.username || null)

  async function saveUsername(e) {
    e.preventDefault()
    if (!user) return
    setUsernameError(null)
    setUsernameSavedAt(null)

    const value = normalizeUsername(usernameDraft)
    // Allow clearing the username (set null)
    if (value !== null) {
      const problem = validateUsername(value)
      if (problem) { setUsernameError(problem); return }
    }
    if (value === (profile?.username || null)) return

    setUsernameSaving(true)
    if (supabase.isConfigured) {
      const { error } = await supabase
        .from('profiles')
        .update({ username: value })
        .eq('id', user.id)
      if (error) {
        const friendly = /duplicate|unique/i.test(error.message)
          ? 'That username is taken — try another.'
          : error.message
        setUsernameError(friendly)
        setUsernameSaving(false)
        return
      }
      await refreshProfile()
    }
    setUsernameSaving(false)
    setUsernameSavedAt(Date.now())
  }

  // Persist methodology immediately on change. Optimistic UI with rollback
  // if the write fails. Free users can't switch off AAOIFI (the <option>s
  // for the others are `disabled`), so this is reachable only for Pro+.
  async function changeMethodology(next) {
    if (!user) return
    const previous = methodology
    setMethodology(next)
    if (!supabase.isConfigured) return
    const { error } = await supabase
      .from('profiles')
      .update({ methodology: next })
      .eq('id', user.id)
    if (error) {
      setMethodology(previous)
      setBillingError(`Couldn't save methodology: ${error.message}`)
    } else {
      await refreshProfile()
    }
  }

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

      {upgradeState === 'pending' && (
        <div className="profile-banner profile-banner--pending" role="status" aria-live="polite">
          <MaterialIcon name="refresh" className="spinner" />
          <span>
            Confirming your upgrade — this normally takes a few seconds.
          </span>
        </div>
      )}
      {upgradeState === 'success' && (
        <div className="profile-banner profile-banner--success" role="status">
          <MaterialIcon name="check_circle" fill />
          <span>Upgrade complete — welcome to {tier === 'scholar' ? 'Scholar' : 'Pro'}.</span>
        </div>
      )}
      {upgradeState === 'timeout' && (
        <div className="profile-banner profile-banner--error" role="alert">
          <MaterialIcon name="error_outline" />
          <span>
            Payment received but we couldn't confirm your tier yet. Refresh in
            a minute, or email <a href="mailto:support@halaq.app">support@halaq.app</a>{' '}
            if it doesn't update.
          </span>
        </div>
      )}

      <div className="profile-layout">

        <div className="profile-sidebar">
          <div className="user-card card-standard">
            <div className="user-avatar" aria-hidden>{initials}</div>
            <h2 className="text-h2 mt-4 truncate" title={headline}>
              {profile?.username ? `@${headline}` : headline}
            </h2>
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
            <h3 className="section-title">Public username</h3>
            <div className="settings-card">
              <form className="username-editor" onSubmit={saveUsername}>
                <div className="username-editor__head">
                  <div>
                    <div className="settings-label">Display handle</div>
                    <div className="settings-desc">
                      Shown on your home screen instead of your email. Letters,
                      numbers and underscores. 3–{USERNAME_MAX} chars.
                    </div>
                  </div>
                </div>
                <div className="username-editor__row">
                  <div className="username-editor__input-wrap">
                    <span className="username-editor__prefix" aria-hidden="true">@</span>
                    <input
                      type="text"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      maxLength={USERNAME_MAX}
                      pattern="[a-z0-9_]{3,20}"
                      className={`username-editor__input ${usernameError ? 'is-invalid' : ''}`}
                      value={usernameDraft}
                      onChange={(e) => {
                        setUsernameDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                        if (usernameError) setUsernameError(null)
                        if (usernameSavedAt) setUsernameSavedAt(null)
                      }}
                      placeholder={profile?.username || 'choose_a_handle'}
                      aria-label="Username"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary username-editor__save"
                    disabled={usernameSaving || !usernameDirty}
                  >
                    {usernameSaving
                      ? <MaterialIcon name="refresh" className="spinner" size={18} />
                      : 'Save'}
                  </button>
                </div>
                {usernameError ? (
                  <p className="username-editor__error">{usernameError}</p>
                ) : usernameSavedAt ? (
                  <p className="username-editor__success">
                    <MaterialIcon name="check_circle" fill size={14} /> Username updated.
                  </p>
                ) : null}
              </form>
            </div>
          </section>

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
                  onChange={(e) => changeMethodology(e.target.value)}
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
                <strong>Cross-checked against</strong>
                <span>
                  Verdicts are validated against the published Shariah index
                  methodologies (S&amp;P Dow Jones Islamic, FTSE Shariah, MSCI
                  Islamic) and against AAOIFI's audit framework. Discrepancies
                  are treated as bugs.
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
