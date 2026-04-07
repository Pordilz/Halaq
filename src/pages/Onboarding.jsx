import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MaterialIcon from '../components/MaterialIcon';
import './Onboarding.css';

export default function Onboarding() {
  const [slide, setSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (slide < 2) {
      setSlide(slide + 1);
    } else {
      navigate('/signup');
    }
  };

  const skipToLogin = () => navigate('/login');

  return (
    <div className={`onboarding-container slide-${slide}`}>
      <div className="ambient-glow-mint" />
      <div className="ambient-glow-gold" />

      <div className="onboarding-header">
        {slide < 2 && (
          <button className="skip-btn" onClick={skipToLogin}>
            Skip
          </button>
        )}
      </div>

      <div className="onboarding-content">
        <div className="onboarding-illustration">
          {/* SLIDE 1 */}
          <div className={`slide-visual slide-1-visual ${slide === 0 ? 'active' : ''}`}>
             <div className="glass-card-center">
               <MaterialIcon name="assured_workload" fill={true} className="hero-icon text-primary" />
             </div>
          </div>

          {/* SLIDE 2 */}
          <div className={`slide-visual slide-2-visual ${slide === 1 ? 'active' : ''}`}>
             <div className="compliance-card-stack">
               <div className="mock-card card-back">
                 <span className="ticker">MSFT</span>
                 <div className="chip gap-1 text-on-tertiary-fixed bg-tertiary-fixed font-bold text-xs px-3 py-1 rounded-full flex-row">
                   <MaterialIcon name="check_circle" fill size={14} /> COMPLIANT
                 </div>
               </div>
               <div className="mock-card card-front">
                 <span className="ticker">AAPL</span>
                 <div className="chip gap-1 text-on-tertiary-fixed bg-tertiary-fixed font-bold text-xs px-3 py-1 rounded-full flex-row">
                   <MaterialIcon name="check_circle" fill size={14} /> COMPLIANT
                 </div>
               </div>
             </div>
          </div>

          {/* SLIDE 3 */}
          <div className={`slide-visual slide-3-visual ${slide === 2 ? 'active' : ''}`}>
             <div className="hero-circle">
               <MaterialIcon name="mosque" fill={true} className="hero-icon text-primary" />
               <div className="floating-chip glass-panel-dark">
                 <MaterialIcon name="star" fill className="text-secondary" size={16} />
                 <span className="font-bold text-sm">12 Watchlisted</span>
               </div>
             </div>
             <div className="sector-chips">
               <span className="sector-chip ok"><MaterialIcon name="check" size={14}/> Technology</span>
               <span className="sector-chip ok"><MaterialIcon name="check" size={14}/> Healthcare</span>
               <span className="sector-chip fail"><MaterialIcon name="close" size={14}/> Finance</span>
             </div>
          </div>
        </div>

        <div className="onboarding-text-area">
          {slide === 0 && (
            <div className="slide-text animate-entrance">
              <h1 className="text-display">Invest With <span className="text-primary">Conviction</span></h1>
              <p className="text-on-surface-variant text-body-lg mt-2">
                Screen any stock for Shariah compliance in seconds.
              </p>
            </div>
          )}
          {slide === 1 && (
            <div className="slide-text animate-entrance">
              <h1 className="text-display">Know Before <span className="text-primary">You Invest</span></h1>
              <div className="privacy-card mt-4">
                All screening data follows AAOIFI & major scholarly standards. No financial advice — just clarity.
              </div>
            </div>
          )}
          {slide === 2 && (
            <div className="slide-text animate-entrance">
              <h1 className="text-display">Your Halal Portfolio <span className="text-primary">Starts Here</span></h1>
              <p className="text-on-surface-variant text-body-lg mt-2">
                Screen 10,000+ global stocks. Build a watchlist. Invest with peace of mind.
              </p>
            </div>
          )}

          {slide < 2 ? (
            <div className="onboarding-footer">
              <div className="pagination-dots">
                <div className={`dot ${slide === 0 ? 'active' : ''}`} onClick={() => setSlide(0)} />
                <div className={`dot ${slide === 1 ? 'active' : ''}`} onClick={() => setSlide(1)} />
                <div className={`dot ${slide === 2 ? 'active' : ''}`} onClick={() => setSlide(2)} />
              </div>
              <button className="btn btn-primary btn-next" onClick={handleNext}>
                {slide === 0 ? 'Get Started →' : 'Next →'}
              </button>
            </div>
          ) : (
            <div className="onboarding-footer-final animate-entrance delay-100">
              <Link to="/signup" className="btn btn-primary flex-center w-full mt-6">
                Create Free Account
              </Link>
              <Link to="/login" className="btn btn-secondary flex-center w-full mt-3 font-bold">
                I already have an account
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Desktop View Split */}
      <div className="desktop-split">
        <div className="desktop-illustration" />
      </div>
    </div>
  );
}
