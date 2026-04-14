import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MaterialIcon from './MaterialIcon';
import './OnboardingCarousel.css';

export default function OnboardingCarousel({ onBack }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const scrollContainerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mobile scroll snapping
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    
    const handleScroll = () => {
      const slideWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;
      const index = Math.round(scrollLeft / slideWidth);
      if (index !== currentSlide) {
        setCurrentSlide(index);
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMobile, currentSlide]);

  const goToSlide = (index) => {
    if (isMobile && scrollContainerRef.current) {
      const slideWidth = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({
        left: slideWidth * index,
        behavior: 'smooth'
      });
    } else {
      setCurrentSlide(index);
    }
  };

  const panelBgs = [
    'var(--color-surface)',
    'var(--color-surface-container)',
    'var(--color-surface-container-low)'
  ];

  return (
    <div className="carousel-outer">
      {/* Decorative Glow Orbs */}
      <div className="ambient-glow-mint" style={{ bottom: '-96px', left: '-96px', zIndex: -10, animation: 'glowPulse 6s ease-in-out infinite' }} />
      <div className="ambient-glow-gold" style={{ top: '-96px', right: '-96px', zIndex: -10, animation: 'glowPulse 9s ease-in-out infinite 2s' }} />
      {!isMobile && (
        <div style={{ position: 'fixed', top: '50%', left: '25%', transform: 'translate(-50%,-50%)', width: '600px', height: '600px', background: 'rgba(163, 240, 202, 0.08)', borderRadius: '9999px', filter: 'blur(120px)', pointerEvents: 'none', zIndex: -10, animation: 'glowPulse 12s ease-in-out infinite 1s' }} />
      )}

      {/* Website Nav */}
      {!isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '64px', padding: '0 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: '100px' }}>
            {currentSlide === 0 && onBack && (
              <button onClick={onBack} className="text-sm font-semibold text-on-surface-variant focus-ghost" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MaterialIcon name="arrow_back" size={16} /> Back to home
              </button>
            )}
          </div>
          <div className="flex-row gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="var(--color-secondary)"/>
            </svg>
            <span className="text-lg font-bold text-primary tracking-tight">Halaq</span>
          </div>
          <div style={{ width: '100px', display: 'flex', justifyContent: 'flex-end' }}>
            {currentSlide < 2 && (
              <button className="carousel-skip-btn animate-entrance delay-200" onClick={() => goToSlide(2)}>Skip</button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Skip */}
      {isMobile && currentSlide < 2 && (
        <button className="carousel-skip-btn carousel-skip-mobile animate-entrance delay-200" onClick={() => goToSlide(2)}>Skip</button>
      )}

      {/* Left Illustration Panel (Website) */}
      {!isMobile && (
        <div className="carousel-illustration-panel" style={{ backgroundColor: panelBgs[currentSlide] }}>
          {/* Slide 1 */}
          {currentSlide === 0 && (
            <div className="slide-illustration flex-column items-center slide-anim-container">
              <div className="illustration-sq">
                <img src="/static/hero-office.jpg" alt="Person calmly reviewing stock charts at a well-lit desk, natural light" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, position: 'absolute', inset: 0 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #f8f9fb 0%, transparent 55%)' }} />
                <div className="glass-white p-8 rounded-3xl shadow-floating slide-glass-card" style={{ position: 'relative', zIndex: 10 }}>
                  <MaterialIcon name="assured_workload" size={80} className="text-primary gentle-sway-icon" />
                </div>
              </div>
              <div className="flex-row gap-2 mt-6">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="var(--color-secondary)"/>
                </svg>
                <span className="text-lg font-bold text-primary tracking-tight">Halaq</span>
              </div>
            </div>
          )}

          {/* Slide 2 */}
          {currentSlide === 1 && (
            <div className="slide-illustration flex-column items-center w-full slide-anim-container" style={{ padding: '0 40px' }}>
              <div className="w-full flex-between" style={{ padding: '0 20px' }}>
                <div className="glass-white p-7 rounded-[2rem] shadow-floating tilt-left w-64 gentle-sway-icon">
                  <div className="flex-column gap-2 items-start">
                    <div className="bg-primary-fixed/40 text-primary font-extrabold text-sm px-2 py-1 rounded-lg tabular-nums text-center w-12">AAPL</div>
                    <div className="text-sm font-bold text-on-surface">Apple Inc.</div>
                    <div className="bg-tertiary-fixed text-on-tertiary-fixed rounded-full text-xs font-bold px-2 py-1 flex-row gap-1 mt-2">
                       <MaterialIcon name="check_circle" size={16} fill /> COMPLIANT
                    </div>
                  </div>
                </div>
                
                <div className="glass-white p-7 rounded-[2rem] shadow-floating tilt-right w-64 mt-16 delay-100">
                  <div className="flex-column gap-2 items-start">
                    <div className="bg-primary-fixed/40 text-primary font-extrabold text-sm px-2 py-1 rounded-lg tabular-nums text-center w-12">TSLA</div>
                    <div className="text-sm font-bold text-on-surface">Tesla Inc.</div>
                    <div className="flex-column items-start mt-2">
                      <div className="bg-caution-container text-on-caution-container rounded-full text-xs font-bold px-2 py-1 flex-row gap-1">
                        <MaterialIcon name="help" size={16} fill /> DOUBTFUL
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-on-caution-container mt-1 ml-1">Review ratios</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="w-[80%] mt-12 animate-bar-grow">
                <div className="w-full h-[3px] bg-surface-highest rounded-full flex overflow-hidden">
                  <div className="h-full bg-tertiary" style={{ width: '60%' }} />
                  <div className="h-full bg-secondary-container" style={{ width: '25%' }} />
                  <div className="h-full bg-error" style={{ width: '15%' }} />
                </div>
                <div className="text-xs text-on-surface-variant text-center mt-2">6 of 10 screened stocks are compliant</div>
              </div>
            </div>
          )}

          {/* Slide 3 */}
          {currentSlide === 2 && (
            <div className="slide-illustration flex-column items-center slide-anim-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
               <div className="watchlist-circle" style={{ position: 'absolute', top: '40%', transform: 'translateY(-50%)' }}>
                  <MaterialIcon name="bookmarks" size={120} className="text-primary gentle-sway-icon-late" fill />
               </div>
               <div className="glass-white p-3 px-4 rounded-2xl shadow-floating flex-row gap-2 float-badge-anim animate-entrance delay-150" style={{ position: 'absolute', top: '30%', right: '15%' }}>
                 <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                   <MaterialIcon name="star" fill size={16} className="text-white" />
                 </div>
                 <span className="text-sm font-bold text-on-surface">12 Stocks Saved</span>
               </div>

               {/* Ghost chips */}
               <div className="glass-white px-3 py-2 rounded-full text-xs font-bold text-on-surface animate-entrance delay-200" style={{ position: 'absolute', bottom: '30%', left: '20%', transform: 'rotate(-8deg)', opacity: 0.65 }}>✓ AAPL</div>
               <div className="glass-white px-3 py-2 rounded-full text-xs font-bold text-on-surface animate-entrance delay-250" style={{ position: 'absolute', bottom: '25%', right: '25%', transform: 'rotate(5deg)', opacity: 0.55 }}>✓ MSFT</div>
               <div className="glass-white px-3 py-2 rounded-full text-xs font-bold text-on-surface animate-entrance delay-300" style={{ position: 'absolute', bottom: '15%', left: '45%', transform: 'rotate(2deg)', opacity: 0.60 }}>? TSLA</div>
            </div>
          )}
        </div>
      )}

      {/* Right Text Panel (Website) or Full Mobile Scroller */}
      <div className={`carousel-content-area ${isMobile ? 'carousel-container' : 'carousel-text-panel'}`} ref={scrollContainerRef}>
        
        {/* Slide 1 Content */}
        <div className={`carousel-slide ${!isMobile ? 'slide-content' : 'mobile-slide'} ${currentSlide === 0 ? 'active' : ''}`}>
           {isMobile && (
             <div className="mobile-illustration-block">
               <div className="illustration-sq slide-anim-container">
                  <div style={{ background: '#f8f9fb', position: 'absolute', inset: 0 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #f8f9fb 0%, transparent 55%)' }} />
                  <div className="glass-white p-6 rounded-3xl shadow-floating slide-glass-card" style={{ position: 'relative', zIndex: 10 }}>
                    <MaterialIcon name="assured_workload" size={64} className="text-primary gentle-sway-icon" />
                  </div>
               </div>
             </div>
           )}

           <div className={`text-block ${isMobile ? 'mobile-text-block' : ''}`}>
             {!isMobile && (
               <div className="bg-surface-low rounded-full px-4 py-2 inline-flex items-center gap-2 mb-6 w-max animate-entrance delay-50">
                 <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">✦ Step 1 of 3</span>
               </div>
             )}
             
             <h1 className={`${isMobile ? 'text-[2rem]' : 'text-[2.5rem]'} font-extrabold tracking-tight leading-[1.15] text-on-surface animate-entrance delay-100`}>
                Invest With <span className="text-primary">Conviction</span>
             </h1>
             
             <p className={`text-lg text-on-surface-variant mt-5 leading-relaxed animate-entrance delay-150 ${isMobile ? 'max-w-[280px]' : 'max-w-[400px]'}`}>
                Screen any stock for Shariah compliance in seconds. {!isMobile && "Built on established scholarly standards, for Muslim investors who won't compromise."}
             </p>

             {!isMobile && (
               <button className="btn btn-primary mt-10 w-[200px] animate-entrance delay-200" onClick={() => goToSlide(1)}>Next  →</button>
             )}

             {!isMobile && (
               <div className="flex gap-2 mt-6 animate-entrance delay-250">
                 <div className="dot active" />
                 <div className="dot inactive" />
                 <div className="dot inactive" />
               </div>
             )}

             {!isMobile && (
               <div className="text-xs text-on-surface-variant mt-auto pt-10 animate-entrance delay-300">
                 🔒 Your screening history stays private. Always.
               </div>
             )}
           </div>
        </div>

        {/* Slide 2 Content */}
        <div className={`carousel-slide ${!isMobile ? 'slide-content' : 'mobile-slide'} ${currentSlide === 1 ? 'active' : ''}`} style={isMobile ? { backgroundColor: 'var(--color-surface-container-low)' } : {}}>
           {isMobile && (
             <div className="mobile-illustration-block grid grid-cols-2 gap-4 w-full">
                <div className="glass-white p-5 rounded-[1.5rem] shadow-floating tilt-left gentle-sway-icon">
                  <div className="flex-column gap-2 items-start">
                    <div className="bg-primary-fixed/40 text-primary font-extrabold text-sm px-2 py-1 rounded-lg tabular-nums text-center w-12">AAPL</div>
                    <div className="text-[13px] font-bold text-on-surface">Apple Inc.</div>
                    <div className="bg-tertiary-fixed text-on-tertiary-fixed rounded-full text-[10px] font-bold px-2 py-1 flex-row gap-1 mt-2">
                       <MaterialIcon name="check_circle" size={12} fill /> COMPLIANT
                    </div>
                  </div>
                </div>
                <div className="glass-white p-5 rounded-[1.5rem] shadow-floating tilt-right mt-8 delay-100">
                  <div className="flex-column gap-2 items-start">
                    <div className="bg-primary-fixed/40 text-primary font-extrabold text-sm px-2 py-1 rounded-lg tabular-nums text-center w-12">TSLA</div>
                    <div className="text-[13px] font-bold text-on-surface">Tesla Inc.</div>
                    <div className="flex-column items-start mt-2">
                      <div className="bg-caution-container text-on-caution-container rounded-full text-[10px] font-bold px-2 py-1 flex-row gap-1">
                        <MaterialIcon name="help" size={12} fill /> DOUBTFUL
                      </div>
                      <div className="text-[9px] font-semibold uppercase tracking-widest text-on-caution-container mt-1 ml-1">Review ratios</div>
                    </div>
                  </div>
                </div>
             </div>
           )}

           <div className={`text-block pt-10 ${isMobile ? 'mobile-text-block' : ''}`}>
             {!isMobile && (
               <div className="bg-surface-low rounded-full px-4 py-2 inline-flex items-center gap-2 mb-6 w-max animate-entrance delay-50">
                 <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">📊 Step 2 of 3</span>
               </div>
             )}
             
             <h1 className={`${isMobile ? 'text-[2rem]' : 'text-[2.5rem]'} font-extrabold tracking-tight leading-[1.15] text-on-surface animate-entrance delay-100`}>
                Know Before You <span className="text-primary">Invest</span>
             </h1>
             
             {!isMobile && (
               <p className="text-lg text-on-surface-variant mt-5 leading-relaxed animate-entrance delay-150 max-w-[400px]">
                  Every stock shows a full compliance ruling with all four financial ratios. Understand exactly why a stock passes, fails, or sits in the grey area.
               </p>
             )}

             <div className="bg-caution-container/40 p-4 rounded-2xl animate-entrance delay-200 mt-6 max-w-[400px]">
               <p className="text-base text-on-surface-variant leading-relaxed">
                 Compliance data is screened against <strong className="text-on-surface">AAOIFI and major scholarly standards</strong>. Guidance only — not a fatwa.
               </p>
             </div>

             {!isMobile && (
               <button className="btn btn-primary mt-10 w-[200px] animate-entrance delay-250" onClick={() => goToSlide(2)}>Next  →</button>
             )}

             {!isMobile && (
               <div className="flex gap-2 mt-6 animate-entrance delay-300">
                 <div className="dot inactive" />
                 <div className="dot active" />
                 <div className="dot inactive" />
               </div>
             )}
           </div>
        </div>

        {/* Slide 3 Content */}
        <div className={`carousel-slide ${!isMobile ? 'slide-content' : 'mobile-slide'} ${currentSlide === 2 ? 'active' : ''}`}>
           {isMobile && (
             <div className="mobile-illustration-block">
               <div className="watchlist-circle-sm slide-anim-container relative">
                  <MaterialIcon name="bookmarks" size={96} className="text-primary gentle-sway-icon-late" fill />
                  <div className="glass-white py-3 px-4 rounded-2xl shadow-floating flex-row gap-2 float-badge-anim animate-entrance delay-200" style={{ position: 'absolute', top: 0, right: '-20px' }}>
                    <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                      <MaterialIcon name="star" fill size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-on-surface">12 Stocks Saved</span>
                  </div>
               </div>
             </div>
           )}

           <div className={`text-block ${isMobile ? 'mobile-text-block text-center' : ''}`}>
             {!isMobile && (
               <div className="bg-surface-low rounded-full px-4 py-2 inline-flex items-center gap-2 mb-6 w-max animate-entrance delay-50">
                 <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">🔖 Step 3 of 3</span>
               </div>
             )}
             
             <h1 className={`${isMobile ? 'text-[2rem]' : 'text-[2.5rem]'} font-extrabold tracking-tight leading-[1.15] text-on-surface animate-entrance delay-100`}>
                Build Your <span className="text-primary">Halal Portfolio</span>
             </h1>
             
             <p className={`text-[1.125rem] text-on-surface-variant mt-5 leading-relaxed animate-entrance delay-150 ${isMobile ? 'max-w-[320px] mx-auto' : 'max-w-[400px]'}`}>
                {isMobile 
                  ? "Save compliant stocks. Get alerted to compliance changes. Invest with complete peace of mind."
                  : "Save compliant stocks to your watchlist, track compliance changes in real time, and invest knowing every position is screened — clearly, transparently, and for free."
                }
             </p>

             <div className={`flex flex-col gap-3 pt-8 animate-entrance delay-200 ${isMobile ? 'w-full' : 'max-w-[320px]'}`}>
                <button className="btn btn-primary" onClick={() => navigate('/signup')} style={{ height: '56px', borderRadius: '1rem', width: '100%' }}>Create Free Account</button>
                <button className="btn btn-secondary" onClick={() => navigate('/login')} style={{ height: '56px', borderRadius: '1rem', width: '100%', backgroundColor: 'var(--color-surface-container-low)' }}>Sign In</button>
             </div>

             {!isMobile && (
               <div className="text-xs text-on-surface-variant mt-4 animate-entrance delay-250">
                 🔒 No credit card. No data sold. No compromise.
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Mobile Pagination Dots */}
      {isMobile && currentSlide < 2 && (
        <div className="mobile-dots-container animate-entrance delay-200">
          <div className={`dot ${currentSlide === 0 ? 'active' : 'inactive'}`} />
          <div className={`dot ${currentSlide === 1 ? 'active' : 'inactive'}`} />
          <div className={`dot ${currentSlide === 2 ? 'active' : 'inactive'}`} />
        </div>
      )}
    </div>
  );
}
