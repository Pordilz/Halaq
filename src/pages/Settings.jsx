import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession, openBillingPortal } from '../services/halaqApi';
import { CreditCard, CheckCircle2, ShieldAlert, Star } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './Settings.css';

export default function Settings() {
  const { profile, tier, isPro, isScholar } = useAuth();
  const [loadingTier, setLoadingTier] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('upgrade') === 'success') {
      setSuccessMessage('Thank you for upgrading! Your subscription is now active.');
    } else if (params.get('upgrade') === 'cancelled') {
      setError('Checkout was cancelled.');
    }
  }, [location.search]);

  const handleCheckout = async (newTier) => {
    try {
      setLoadingTier(newTier);
      setError(null);
      await createCheckoutSession(newTier);
    } catch (err) {
      setError(err.message);
      setLoadingTier(null);
    }
  };

  const handlePortal = async () => {
    try {
      setPortalLoading(true);
      setError(null);
      await openBillingPortal();
    } catch (err) {
      setError(err.message);
      setPortalLoading(false);
    }
  };

// Actually, I should replace the entire render block.
  return (
    <div className="settings-page">
      <div className="container">
        <div className="settings-header">
          <h1>Account Settings</h1>
        </div>
        
        {error && <div className="alert alert-error"><ShieldAlert size={20}/> {error}</div>}
        {successMessage && <div className="alert alert-success"><CheckCircle2 size={20}/> {successMessage}</div>}

        <div className="current-plan-card">
          <h2>{tier ? tier.toUpperCase() : 'FREE'} PLAN</h2>
          <p>You are currently subscribed to the Halaq {tier || 'free'} tier.</p>
          
          {(isPro || isScholar) && (
            <button className="btn btn-outline manage-btn" onClick={handlePortal} disabled={portalLoading}>
              <CreditCard size={18} style={{marginRight: '8px'}}/>
              {portalLoading ? 'Loading Portal...' : 'Manage Billing & Invoices'}
            </button>
          )}
        </div>

        {!isScholar && (
          <div className="upgrade-section">
            <h2>Upgrade Your Experience</h2>
            <p className="upgrade-subtitle">Unlock advanced AI tools and unlimited screening capabilities.</p>
            <div className="settings-plans-grid">
              {!isPro && (
                <div className="settings-plan-card">
                  <h3>Pro</h3>
                  <div className="price-container">
                    <div className="price">$9</div>
                    <div className="period">/month</div>
                  </div>
                  <ul>
                    <li><CheckCircle2 size={18}/> Unlimited daily stock searches</li>
                    <li><CheckCircle2 size={18}/> AI Compliance Explainer</li>
                    <li><CheckCircle2 size={18}/> Halal Alternatives</li>
                    <li><CheckCircle2 size={18}/> Batch Screening (up to 20)</li>
                  </ul>
                  <button className="btn btn-primary btn-block" onClick={() => handleCheckout('pro')} disabled={loadingTier !== null}>
                    {loadingTier === 'pro' ? 'Preparing checkout...' : 'Upgrade to Pro'}
                  </button>
                </div>
              )}
              
              <div className="settings-plan-card highlight">
                <div className="popular-badge">
                  Most Advanced
                </div>
                <h3>Scholar</h3>
                <div className="price-container">
                  <div className="price">$19</div>
                  <div className="period">/month</div>
                </div>
                <ul>
                  <li><CheckCircle2 size={18}/> Everything in Pro</li>
                  <li><CheckCircle2 size={18}/> Unlimited Batch Screening</li>
                  <li><CheckCircle2 size={18}/> Custom ETF Holding X-Ray</li>
                  <li><CheckCircle2 size={18}/> AI Shariah Chatbot Assistant</li>
                  <li><CheckCircle2 size={18}/> Formal Compliance PDF Reports</li>
                </ul>
                <button className="btn btn-primary btn-block" onClick={() => handleCheckout('scholar')} disabled={loadingTier !== null}>
                  {loadingTier === 'scholar' ? 'Preparing checkout...' : 'Upgrade to Scholar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
