import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from '../components/MaterialIcon'
import './Profile.css'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState(profile?.alerts_enabled || false)
  const [methodology, setMethodology] = useState('AAOIFI')

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <h2 className="text-h2">Sign in to view your profile</h2>
        <button className="btn btn-primary mt-6 mx-auto" onClick={() => navigate('/login')}>Log In</button>
      </div>
    )
  }

  const initials = profile?.email ? profile.email.charAt(0).toUpperCase() : (user.email?.charAt(0).toUpperCase() || 'U')
  const fullName = profile?.full_name || 'Halaq Investor'
  const email = profile?.email || user.email

  // Premium tier logic
  const tier = profile?.subscription_tier || 'free'
  const isPro = tier === 'pro' || tier === 'scholar' || tier === 'admin'

  return (
    <div className="profile-page container animate-entrance">
      <div className="profile-header mb-8 mt-4">
        <h1 className="text-h1 mb-2">Profile & Settings</h1>
      </div>

      <div className="profile-layout">
         
         {/* Sidebar / User Summary */}
         <div className="profile-sidebar">
           <div className="user-card card-standard">
              <div className="user-avatar">{initials}</div>
              <h2 className="text-h2 mt-4">{fullName}</h2>
              <p className="text-on-surface-variant text-body-sm">{email}</p>
              
              <div className="tier-badge mt-4">
                <MaterialIcon name={isPro ? "workspace_premium" : "account_circle"} size={18} />
                <span>Current Plan: <strong>{tier.toUpperCase()}</strong></span>
              </div>
              
              {!isPro && (
                <button className="btn btn-primary w-full mt-6" onClick={() => navigate('/upgrade')}>
                  Upgrade to Pro
                </button>
              )}
           </div>
         </div>

         {/* Main Content Area */}
         <div className="profile-main">
            
            {/* Screening Preferences */}
            <section className="settings-section">
              <h3 className="section-title">Screening Preferences</h3>
              <div className="card-standard p-1">
                <div className="settings-row">
                  <div className="settings-info">
                    <div className="settings-label">Default Methodology</div>
                    <div className="settings-desc">Which standard governs your compliance rules.</div>
                  </div>
                  <select 
                    className="settings-select"
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    disabled={!isPro}
                  >
                    <option value="AAOIFI">AAOIFI</option>
                    <option value="SP_DJI">S&P DJI (Pro)</option>
                    <option value="MSCI">MSCI (Pro)</option>
                  </select>
                </div>
                {!isPro && (
                  <div className="premium-upsell px-5 pb-5">
                    <MaterialIcon name="lock" size={14} className="text-primary" />
                    <span>Multiple methodologies are a Pro feature.</span>
                  </div>
                )}
              </div>
            </section>

            {/* Notifications */}
            <section className="settings-section">
              <h3 className="section-title">Notifications</h3>
              <div className="card-standard p-1">
                <div className="settings-row">
                  <div className="settings-info">
                    <div className="settings-label">Compliance Change Alerts</div>
                    <div className="settings-desc">Get an email if a stock in your watchlist changes status.</div>
                  </div>
                  <label className={`toggle-switch ${notifications ? 'active' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={notifications} 
                      onChange={() => setNotifications(!notifications)} 
                      className="sr-only"
                    />
                    <div className="toggle-slider"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* Account Management */}
            <section className="settings-section">
              <h3 className="section-title">Account</h3>
              <div className="card-standard p-1 flex-column">
                <button className="settings-link-btn" onClick={() => {}} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Coming soon — billing integration in progress">
                   <div className="flex-row gap-3">
                     <MaterialIcon name="payment" size={20} className="text-outline" />
                     <span>Manage Subscription & Billing</span>
                   </div>
                   <MaterialIcon name="chevron_right" className="text-outline" />
                </button>
                <div className="settings-divider" />
                <button className="settings-link-btn text-error" onClick={handleSignOut}>
                   <div className="flex-row gap-3">
                     <MaterialIcon name="logout" size={20} className="text-error" />
                     <span>Log Out</span>
                   </div>
                </button>
              </div>
            </section>

            {/* About */}
            <section className="settings-section">
              <h3 className="section-title">About Halaq</h3>
              <div className="card-standard p-6">
                <p className="text-on-surface-variant text-body-sm mb-4">
                  Version 1.0 Beta
                </p>
                <div className="flex gap-4">
                  <a href="#" className="text-primary font-heading text-body-sm">Terms of Use</a>
                  <a href="#" className="text-primary font-heading text-body-sm">Privacy Policy</a>
                  <a href="#" className="text-primary font-heading text-body-sm">Contact Support</a>
                </div>
              </div>
            </section>

         </div>
      </div>
    </div>
  )
}
