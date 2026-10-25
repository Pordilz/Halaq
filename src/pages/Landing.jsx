import { lazy, Suspense } from 'react'
import { Link } from 'react-router'
import Logo from '../components/Logo'
import useDocumentTitle from '../hooks/useDocumentTitle'
import './Landing.css'

const LandingSections = lazy(() => import('../components/landing/LandingSections'))

export default function Landing() {
  useDocumentTitle(null, 'Check any listed stock against the AAOIFI, S&P, Dow Jones and FTSE Shariah standards, with every number behind the verdict.')

  return (
    <div className="lp">
      <section className="lp-hero">
        <div className="lp-hero__sky" />
        <div className="lp-hero__sea" />
        <header className="lp-nav">
          <Link to="/" className="lp-nav__brand" aria-label="Halaq home">
            <Logo size={26} color="currentColor" title="" />
            Halaq
          </Link>
          <nav className="lp-nav__actions" aria-label="Account">
            <Link to="/login" className="lp-link">Sign in</Link>
            <Link to="/screener" className="lp-btn">Screen a stock</Link>
          </nav>
        </header>
        <h1 className="lp-hero__title" aria-label="Halal or not">
          {['above', 'below'].map(layer => (
            <span key={layer} className={`lp-hero__layer lp-hero__layer--${layer}`} aria-hidden="true">
              <span className="lp-line"><span style={{ '--i': 0 }}>Halal</span></span>
              <span className="lp-line"><span style={{ '--i': 1 }}>or not</span></span>
            </span>
          ))}
        </h1>
        <p className="lp-hero__sentence">
          Halaq checks a listed stock against the published Shariah standards and shows every number
          behind the verdict, free for 50 stocks a day.
        </p>
      </section>
      <Suspense fallback={null}>
        <LandingSections />
      </Suspense>
    </div>
  )
}
