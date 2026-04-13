import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MaterialIcon from '../components/MaterialIcon';
import OnboardingCarousel from '../components/OnboardingCarousel';
import './Landing.css';

export default function Landing() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showCarousel, setShowCarousel] = useState(isMobile);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !showCarousel) setShowCarousel(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showCarousel]);

  if (showCarousel) {
    return <OnboardingCarousel onBack={isMobile ? undefined : () => setShowCarousel(false)} />;
  }

  return (
    <div className="landing-page bg-surface" style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* Decorative Glow Orbs */}
      <div className="ambient-glow-mint" style={{ bottom: '-10%', right: '-5%', width: '500px', height: '500px', filter: 'blur(100px)', animation: 'glowPulse 8s ease-in-out infinite' }} />
      <div className="ambient-glow-gold" style={{ top: '-10%', left: '-5%', width: '400px', height: '400px', filter: 'blur(80px)', animation: 'glowPulse 8s ease-in-out infinite' }} />

      {/* Global Nav Bar */}
      <nav className="glass-panel" style={{ position: 'fixed', width: '100%', zIndex: 50, height: '72px', padding: '0 48px' }}>
        <div className="flex-between" style={{ maxWidth: '80rem', margin: '0 auto', height: '100%' }}>
          <div className="flex-row" style={{ gap: '0.5rem' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="var(--color-secondary)"/>
            </svg>
            <span className="text-primary" style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Halaq</span>
          </div>
          
          <div className="landing-links" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
             <a href="#how" className="text-on-surface-variant" style={{ fontSize: '0.875rem', fontWeight: 600 }}>How It Works</a>
             <a href="#standards" className="text-on-surface-variant" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Standards</a>
             <a href="#about" className="text-on-surface-variant" style={{ fontSize: '0.875rem', fontWeight: 600 }}>About</a>
             <a href="#learn" className="text-on-surface-variant" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Learn</a>
          </div>

          <div className="flex-row" style={{ gap: '1rem' }}>
             <Link to="/login" className="text-primary" style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0.5rem 1rem' }}>Sign In</Link>
             <button onClick={() => setShowCarousel(true)} className="btn btn-primary" style={{ height: '44px', minHeight: '44px', padding: '0 1.5rem', fontSize: '0.875rem' }}>Start Screening Free →</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: '72px', paddingLeft: '4rem', paddingRight: '4rem', maxWidth: '80rem', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '3rem', width: '100%' }}>
          
          {/* Hero Left Text */}
          <div className="flex-column justify-center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="bg-surface-low animate-entrance delay-100" style={{ borderRadius: '9999px', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', width: 'max-content' }}>
               <span className="text-on-surface-variant" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>✦ Free · AAOIFI-Aligned · 10,000+ Stocks</span>
            </div>
            
            <h1 className="text-on-surface animate-entrance delay-200" style={{ fontSize: '4rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
               Invest with<br/><span className="text-primary">clear conscience.</span>
            </h1>
            
            <p className="text-on-surface-variant animate-entrance delay-300" style={{ fontSize: '1.125rem', marginTop: '1.5rem', lineHeight: 1.7, maxWidth: '480px' }}>
               Halaq is the Shariah stock screener built for Muslim investors who refuse to compromise. Screen any stock in seconds against AAOIFI and major scholarly standards — for free, forever.
            </p>

            <div className="flex-row animate-entrance delay-400" style={{ gap: '1.25rem', marginTop: '2.5rem' }}>
               <button onClick={() => setShowCarousel(true)} className="btn btn-primary" style={{ height: '56px', minHeight: '56px', padding: '0 2rem', fontSize: '1rem' }}>Start Screening Free →</button>
               <button className="text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                  <MaterialIcon name="play_circle" /> See how it works ▶
               </button>
            </div>

            <div className="flex-row animate-entrance delay-500" style={{ alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
               <div style={{ display: 'flex', marginLeft: '0.5rem' }}>
                 {['U', 'O', 'A', 'K'].map((initial, i) => (
                   <div key={i} className="bg-primary-fixed text-on-primary-fixed" style={{ width: '32px', height: '32px', borderRadius: '50%', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-surface)', marginLeft: '-0.5rem' }}>
                     {initial}
                   </div>
                 ))}
               </div>
               <span className="text-on-surface-variant" style={{ fontSize: '0.875rem' }}>Trusted by Muslim investors screening stocks across 40+ countries</span>
            </div>
          </div>

          {/* Hero Right Preview */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <div className="bg-surface-lowest animate-entrance delay-200" style={{ width: '320px', height: '560px', borderRadius: '3rem', boxShadow: '0 40px 80px rgba(15,26,39,0.12)', transform: 'rotate(2deg)', overflow: 'hidden', padding: '1rem', position: 'relative' }}>
                <div className="bg-surface-low" style={{ width: '100%', borderRadius: '0.75rem', height: '40px', marginBottom: '1rem', display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                  <MaterialIcon name="search" size={16} className="text-outline" />
                </div>
                <div className="flex-column" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="bg-surface flex-between" style={{ padding: '0.75rem', borderRadius: '1rem' }}>
                     <div className="text-primary" style={{ backgroundColor: 'rgba(163, 240, 202, 0.4)', fontWeight: 700, fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '0.5rem' }}>AAPL</div>
                     <div className="bg-tertiary-fixed text-on-tertiary-fixed" style={{ borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 700, padding: '0.25rem 0.5rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}><MaterialIcon name="check_circle" size={12} fill/> COMPLIANT</div>
                  </div>
                  <div className="bg-surface flex-between" style={{ padding: '0.75rem', borderRadius: '1rem' }}>
                     <div className="text-primary" style={{ backgroundColor: 'rgba(163, 240, 202, 0.4)', fontWeight: 700, fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '0.5rem' }}>MSFT</div>
                     <div className="bg-tertiary-fixed text-on-tertiary-fixed" style={{ borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 700, padding: '0.25rem 0.5rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}><MaterialIcon name="check_circle" size={12} fill/> COMPLIANT</div>
                  </div>
                  <div className="bg-surface flex-between" style={{ padding: '0.75rem', borderRadius: '1rem' }}>
                     <div className="text-primary" style={{ backgroundColor: 'rgba(163, 240, 202, 0.4)', fontWeight: 700, fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '0.5rem' }}>V</div>
                     <div className="bg-error-container text-on-error-container" style={{ borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 700, padding: '0.25rem 0.5rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}><MaterialIcon name="cancel" size={12} fill/> NON-COMPLIANT</div>
                  </div>
                </div>
             </div>

             {/* Floating Badges */}
             <div className="animate-entrance delay-300" style={{ position: 'absolute', left: '-20px', top: '40px', background: 'rgba(255, 255, 255, 0.88)', backdropFilter: 'blur(12px)', padding: '0.75rem 1rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow-floating)', animation: "scaleSpring 0.6s ease 0.9s both, floatBadge 3.5s ease-in-out infinite 1.5s" }}>
                <MaterialIcon name="check_circle" fill className="text-tertiary" /> <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>AAPL Compliant</span>
             </div>
             
             <div className="animate-entrance delay-400" style={{ position: 'absolute', right: '20px', bottom: '-30px', background: 'rgba(255, 255, 255, 0.88)', backdropFilter: 'blur(12px)', padding: '0.75rem 1rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow-floating)', animation: "scaleSpring 0.6s ease 1.1s both, floatBadge 4s ease-in-out infinite 2s" }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>🔖 12 Stocks Watchlisted</span>
             </div>
             
             <div className="animate-entrance delay-500" style={{ position: 'absolute', right: '-40px', top: '80px', background: 'rgba(255, 255, 255, 0.88)', backdropFilter: 'blur(12px)', padding: '0.75rem 1rem', borderRadius: '1rem', boxShadow: 'var(--shadow-floating)', animation: "scaleSpring 0.6s ease 1.3s both" }}>
                <span className="text-on-surface-variant" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Debt Ratio: 18.4% ✓</span>
             </div>
          </div>
        </div>
      </section>

      {/* Feature Strip */}
      <section style={{ maxWidth: '72rem', margin: '0 auto', paddingTop: '8rem', paddingBottom: '10rem', paddingLeft: '3rem', paddingRight: '3rem' }}>
        <div className="flex-between animate-entrance delay-100" style={{ position: 'relative', zIndex: 10, width: '100%', flexWrap: 'wrap', gap: '4rem', justifyContent: 'center' }}>
           {[
             { i: 'search', l: 'Instant Screening', s: 'Name or ticker, results in seconds' },
             { i: 'assured_workload', l: 'AAOIFI Aligned', s: 'Major scholarly standards covered' },
             { i: 'lock', l: '100% Free', s: 'No paywall. No credit card.' },
             { i: 'bookmarks', fill: true, l: 'Watchlist & Alerts', s: 'Track compliance changes live' },
             { i: 'school', l: 'Learn as You Invest', s: 'Built-in Islamic finance education' }
           ].map((itm, idx) => (
             <div key={idx} className="flex-column" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center', animationDelay: `${idx * 100}ms` }}>
               <div className="bg-surface-low" style={{ width: '4.5rem', height: '4.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <MaterialIcon name={itm.i} size={36} className="text-primary" fill={itm.fill} />
               </div>
               <div>
                  <div className="text-on-surface" style={{ fontSize: '1rem', fontWeight: 700 }}>{itm.l}</div>
                  <div className="text-on-surface-variant" style={{ fontSize: '0.875rem', marginTop: '0.5rem', width: '140px', lineHeight: 1.5 }}>{itm.s}</div>
               </div>
             </div>
           ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="bg-surface-low" style={{ width: '100%', padding: '10rem 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 3rem' }}>
           <div className="text-primary text-center" style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>How It Works</div>
           <h2 className="text-on-surface text-center" style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.025em', maxWidth: '560px', margin: '0 auto 5rem auto' }}>Clarity in three steps.</h2>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
             {[
               { n: '01', t: 'Search any stock', b: 'Type a company name or ticker symbol. Halaq instantly pulls compliance data screened against AAOIFI and other major scholarly standards.', icon: 'search', iconBg: 'rgba(163, 240, 202, 0.25)' },
               { n: '02', t: 'Read the full report', b: 'See the compliance ruling, all four financial ratios, business activity breakdown, and which standard was applied. No jargon — plain language.', icon: 'analytics', iconBg: 'rgba(255, 231, 146, 0.25)' },
               { n: '03', t: 'Build your halal portfolio', b: 'Save compliant stocks to your watchlist. Get alerted the moment a stock\'s compliance status changes. Invest with a clear conscience.', icon: 'bookmarks', iconBg: 'rgba(163, 240, 202, 0.25)' }
             ].map((st, idx) => (
               <div key={idx} className="bg-surface-lowest card-standard" style={{ padding: '3rem 2.5rem', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <div className="text-primary" style={{ position: 'absolute', top: '1.5rem', right: '2rem', fontSize: '3.5rem', fontWeight: 800, opacity: 0.15 }}>{st.n}</div>
                 <div style={{ width: '120px', height: '120px', borderRadius: '2rem', backgroundColor: st.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1rem', marginBottom: '2.5rem' }}>
                   <MaterialIcon name={st.icon} size={56} className="text-primary" />
                 </div>
                 <h3 className="text-h3" style={{ fontWeight: 700, textAlign: 'center', width: '100%', margin: '0 0 1.25rem 0', fontSize: '1.5rem' }}>{st.t}</h3>
                 <p className="text-on-surface-variant" style={{ fontSize: '1rem', textAlign: 'center', lineHeight: 1.6 }}>{st.b}</p>
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* Standards */}
      <section id="standards" className="bg-surface" style={{ width: '100%', padding: '10rem 0 12rem 0' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 3rem' }}>
           <div className="text-primary text-center" style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>Screening Standards</div>
           <h2 className="text-on-surface text-center" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem' }}>Built on established scholarly methodology.</h2>
           <p className="text-on-surface-variant text-center" style={{ fontSize: '1.125rem', maxWidth: '640px', margin: '0 auto 4rem auto', lineHeight: 1.7 }}>
             Halaq screens stocks against the financial ratios and business activity criteria defined by the world's leading Islamic finance standards. We surface the data clearly — the ruling is yours to consider.
           </p>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem' }}>
             {[
               { a: 'AAOIFI', f: "Accounting & Auditing Org for Islamic Financial Institutions", d: "Most widely cited scholarly standard globally" },
               { a: 'DJIM', f: "Dow Jones Islamic Market Index", d: "Widely used for global equity screening" },
               { a: 'S&P', f: "S&P Global Shariah Indices", d: "Used by institutional Islamic investors" },
               { a: 'FTSE', f: "FTSE Shariah Global Equity Index", d: "UK and global market coverage" }
             ].map((std, idx) => (
               <div key={idx} className="bg-surface-lowest card-standard" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                 <div className="text-primary" style={{ fontWeight: 800, fontSize: '1.75rem', marginBottom: '0.5rem' }}>{std.a}</div>
                 <div className="text-on-surface-variant" style={{ fontSize: '0.875rem', marginTop: '0.5rem', minHeight: '3.5rem', lineHeight: 1.5 }}>{std.f}</div>
                 <div className="bg-surface-high" style={{ height: '1px', width: '100%', margin: '1.5rem 0' }} />
                 <div className="text-outline" style={{ fontSize: '0.875rem' }}>{std.d}</div>
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section style={{ backgroundColor: 'rgba(254, 243, 199, 0.3)', width: '100%', padding: '8rem 0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
           <MaterialIcon name="info" size={48} className="text-caution" style={{ marginBottom: '1.5rem' }} />
           <h2 className="text-on-surface text-center" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem' }}>Guidance, not a fatwa.</h2>
           <p className="text-on-surface-variant text-center" style={{ fontSize: '1.125rem', maxWidth: '640px', marginBottom: '3rem', lineHeight: 1.7 }}>
             Halaq provides general Shariah compliance guidance based on publicly available financial data and established scholarly standards. It does not constitute a personal fatwa or financial advice. Rulings may differ between scholars. Please consult a qualified Islamic finance scholar for guidance on your personal situation.
           </p>
           <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
             <div className="bg-caution-container text-on-caution-container" style={{ padding: '0.5rem 1.25rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center' }}><MaterialIcon name="info" size={16}/> Not financial advice</div>
             <div className="bg-caution-container text-on-caution-container" style={{ padding: '0.5rem 1.25rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center' }}><MaterialIcon name="info" size={16}/> Not a personal fatwa</div>
           </div>
        </div>
      </section>

      {/* Final CTA Strip */}
      <section style={{ width: '100%', padding: '10rem 0', background: 'linear-gradient(135deg, #1a6b47 0%, #22875a 100%)' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 3rem', textAlign: 'center' }}>
           <h2 style={{ fontSize: '3.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.025em' }}>Start screening with conviction.</h2>
           <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.85)', margin: '1.5rem 0 3.5rem 0' }}>Free forever. No credit card. No compromise.</p>
           
           <button onClick={() => setShowCarousel(true)} style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: 'var(--color-primary)', fontWeight: 700, height: '60px', padding: '0 2.5rem', borderRadius: '9999px', boxShadow: 'var(--shadow-floating)', fontSize: '1.125rem', border: 'none', cursor: 'pointer' }}>
             Create Free Account →
           </button>
           
           <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', marginTop: '2rem' }}>
             Already have an account? <Link to="/login" style={{ color: 'white', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ width: '100%', backgroundColor: '#0f1a27', color: '#eaf1ff', padding: '6rem 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
          <div>
            <div className="flex-row" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="var(--color-secondary)"/>
              </svg>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Halaq</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'rgba(234,241,255,0.7)', margin: '0 0 1rem 0' }}>Invest with a clear conscience.</p>
            <p style={{ fontSize: '0.875rem', color: 'rgba(234,241,255,0.5)', margin: 0 }}>© 2026 Halaq</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
             <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Product</div>
             {['Screener', 'Watchlist', 'Portfolio', 'Learn'].map(l => <a key={l} href="#" style={{ fontSize: '0.875rem', color: 'rgba(234,241,255,0.7)', textDecoration: 'none' }}>{l}</a>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
             <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Legal</div>
             {['Privacy Policy', 'Terms of Use', 'Data Sources', 'Disclaimer'].map(l => <a key={l} href="#" style={{ fontSize: '0.875rem', color: 'rgba(234,241,255,0.7)', textDecoration: 'none' }}>{l}</a>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
             <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Standards</div>
             {['AAOIFI', 'DJIM', 'S&P Shariah', 'FTSE Shariah'].map(l => <a key={l} href="#" style={{ fontSize: '0.875rem', color: 'rgba(234,241,255,0.7)', textDecoration: 'none' }}>{l}</a>)}
             <a href="#" style={{ fontSize: '0.875rem', color: 'rgba(234,241,255,0.7)', textDecoration: 'none', marginTop: '0.5rem' }}>About our methodology →</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
