import { Link, useNavigate } from 'react-router-dom'
import MaterialIcon from '../components/MaterialIcon'
import Logo from '../components/Logo'
import { HeroPhoneMockup } from '../components/illustrations'
import './Landing.css'

const STANDARDS = [
  {
    code: 'AAOIFI',
    name: 'AAOIFI Shariah Standard 21',
    desc: 'Most widely cited scholarly standard globally',
  },
  {
    code: 'DJIM',
    name: 'Dow Jones Islamic Market',
    desc: 'Used for global equity index screening',
  },
  {
    code: 'S&P',
    name: 'S&P Global Shariah',
    desc: 'Institutional Islamic investor benchmark',
  },
  {
    code: 'FTSE',
    name: 'FTSE Shariah Global Equity',
    desc: 'UK and global market coverage',
  },
]

const STEPS = [
  {
    n: '01',
    icon: 'search',
    t: 'Search any stock',
    b: 'Type a company name or ticker. We pull live financials and run them against AAOIFI methodology in seconds.',
  },
  {
    n: '02',
    icon: 'analytics',
    t: 'Read the full report',
    b: 'See the verdict, every financial ratio, the business activity screen, and which standard was applied — in plain English.',
  },
  {
    n: '03',
    icon: 'bookmarks',
    t: 'Build your halal portfolio',
    b: 'Save compliant stocks, see live prices, and get alerted the moment a holding flips compliance status.',
  },
]

const FEATURES = [
  { icon: 'verified', t: 'AAOIFI-aligned', s: 'Methodology used by Zoya, Musaffa, Wahed.' },
  { icon: 'public', t: 'JSE & US markets', s: '10,000+ equities covered today.' },
  { icon: 'volunteer_activism', t: 'Purification math', s: 'Per-dividend haram-revenue %.' },
  { icon: 'lock', t: 'Privacy-first', s: 'No data sold. Ever.' },
  { icon: 'paid', t: 'Free forever', s: 'Pro is optional. No credit card to start.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav glass-panel">
        <div className="landing-nav__inner">
          <Link to="/" className="landing-nav__brand" aria-label="Halaq home">
            <Logo size={28} color="var(--color-primary)" title="" />
            <span>Halaq</span>
          </Link>

          <div className="landing-nav__links">
            <a href="#how">How it works</a>
            <a href="#standards">Standards</a>
            <a href="#features">Features</a>
            <Link to="/learn">Learn</Link>
          </div>

          <div className="landing-nav__actions">
            <Link to="/login" className="landing-nav__signin">Sign in</Link>
            <button type="button" className="btn btn-primary btn--sm" onClick={() => navigate('/signup')}>
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <span className="landing-eyebrow">Free · AAOIFI-aligned · JSE & US stocks</span>
          <h1 className="landing-hero__title">
            Invest with a <span className="text-primary">clear conscience.</span>
          </h1>
          <p className="landing-hero__sub">
            Halaq screens any stock for Shariah compliance in seconds. Built on AAOIFI
            methodology and peer-reviewed against the leading Muslim investing apps.
          </p>

          <div className="landing-hero__ctas">
            <button type="button" className="btn btn-primary btn--lg" onClick={() => navigate('/signup')}>
              Start screening free <MaterialIcon name="arrow_forward" size={18} />
            </button>
            <a href="#how" className="btn btn-ghost btn--lg">
              <MaterialIcon name="play_circle" size={20} /> See how it works
            </a>
          </div>

          <div className="landing-hero__trust">
            <div className="landing-hero__avatars" aria-hidden="true">
              <span>U</span>
              <span>O</span>
              <span>A</span>
              <span>K</span>
            </div>
            <span>Built for Muslim investors worldwide.</span>
          </div>
        </div>

        <div className="landing-hero__art">
          <HeroPhoneMockup width={320} height={560} />
        </div>
      </section>

      {/* Feature strip */}
      <section className="landing-features" id="features">
        <div className="landing-features__grid">
          {FEATURES.map(f => (
            <div key={f.t} className="landing-feature">
              <div className="landing-feature__icon">
                <MaterialIcon name={f.icon} size={22} className="text-primary" />
              </div>
              <div className="landing-feature__title">{f.t}</div>
              <div className="landing-feature__sub">{f.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="landing-how" id="how">
        <div className="landing-how__inner">
          <span className="landing-eyebrow landing-eyebrow--center">How it works</span>
          <h2 className="landing-section-title">Clarity in three steps.</h2>

          <div className="landing-steps">
            {STEPS.map(s => (
              <article key={s.n} className="landing-step">
                <span className="landing-step__num">{s.n}</span>
                <div className="landing-step__icon">
                  <MaterialIcon name={s.icon} size={28} className="text-primary" />
                </div>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Standards */}
      <section className="landing-standards" id="standards">
        <div className="landing-standards__inner">
          <span className="landing-eyebrow landing-eyebrow--center">Screening standards</span>
          <h2 className="landing-section-title">Built on established methodology.</h2>
          <p className="landing-standards__intro">
            We surface the data clearly under the published scholarly standards below — the
            ruling is yours to consider, in consultation with a qualified scholar.
          </p>

          <div className="landing-standards__grid">
            {STANDARDS.map(s => (
              <div key={s.code} className="landing-standard">
                <div className="landing-standard__code">{s.code}</div>
                <div className="landing-standard__name">{s.name}</div>
                <div className="landing-standard__divider" />
                <div className="landing-standard__desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="landing-disclaimer">
        <div className="landing-disclaimer__inner">
          <MaterialIcon name="info" size={36} className="text-caution" />
          <h2>Guidance, not a fatwa.</h2>
          <p>
            Halaq provides general Shariah compliance guidance based on publicly available
            financial data and established scholarly standards. It is not financial advice,
            not a personal fatwa, and not a substitute for consulting a qualified Islamic
            finance scholar.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-cta">
        <div className="landing-cta__inner">
          <h2>Start screening with conviction.</h2>
          <p>Free forever. No credit card. No compromise.</p>
          <button type="button" className="landing-cta__btn" onClick={() => navigate('/signup')}>
            Create free account <MaterialIcon name="arrow_forward" size={18} />
          </button>
          <span className="landing-cta__sub">
            Already have an account? <Link to="/login">Sign in</Link>
          </span>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div className="landing-footer__brand">
            <Logo size={22} color="var(--color-secondary-fixed)" title="" />
            <div>
              <strong>Halaq</strong>
              <span>Invest with a clear conscience.</span>
              <span className="landing-footer__copy">© 2026 Halaq</span>
            </div>
          </div>
          <div className="landing-footer__col">
            <strong>Product</strong>
            <Link to="/screener">Screener</Link>
            <Link to="/watchlist">Watchlist</Link>
            <Link to="/learn">Learn</Link>
            <Link to="/upgrade">Plans</Link>
          </div>
          <div className="landing-footer__col">
            <strong>Legal</strong>
            <a href="/legal/privacy">Privacy policy</a>
            <a href="/legal/terms">Terms of use</a>
            <a href="/legal/disclaimer">Disclaimer</a>
            <a href="/legal/data-sources">Data sources</a>
          </div>
          <div className="landing-footer__col">
            <strong>Standards</strong>
            <a href="https://aaoifi.com" target="_blank" rel="noreferrer">AAOIFI</a>
            <a href="https://www.spglobal.com/spdji/en/index-family/shariah/" target="_blank" rel="noreferrer">S&amp;P Shariah</a>
            <a href="https://www.ftserussell.com/products/indices/ftse-shariah" target="_blank" rel="noreferrer">FTSE Shariah</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
