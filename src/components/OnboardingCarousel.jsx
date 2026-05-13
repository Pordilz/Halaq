import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MaterialIcon from './MaterialIcon'
import Logo from './Logo'
import {
  ScreeningIllustration,
  RulingIllustration,
  PortfolioIllustration,
} from './illustrations'
import './OnboardingCarousel.css'

const SLIDES = [
  {
    eyebrow: 'Step 1 of 3',
    title: 'Invest with conviction',
    titleHighlight: 'conviction',
    body:
      "Screen any stock for Shariah compliance in seconds. Built on AAOIFI methodology and cross-checked against the major Shariah index frameworks (S&P Dow Jones Islamic, FTSE Shariah, MSCI Islamic).",
    Illustration: ScreeningIllustration,
  },
  {
    eyebrow: 'Step 2 of 3',
    title: 'Know before you invest',
    titleHighlight: 'invest',
    body:
      'Every stock comes with a full ruling: business activity, leverage, liquidity, receivables, and haram revenue. Plain English, no jargon.',
    Illustration: RulingIllustration,
  },
  {
    eyebrow: 'Step 3 of 3',
    title: 'Build your halal portfolio',
    titleHighlight: 'halal portfolio',
    body:
      'Save compliant stocks, see live prices, and get alerted the moment a holding flips compliance status.',
    Illustration: PortfolioIllustration,
  },
]

export default function OnboardingCarousel({ onBack }) {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()
  const trackRef = useRef(null)

  const goTo = (index) => {
    if (trackRef.current) {
      const w = trackRef.current.offsetWidth
      trackRef.current.scrollTo({ left: w * index, behavior: 'smooth' })
    } else {
      setCurrent(index)
    }
  }

  // Detect which slide is in view via scroll position (mobile snap)
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.offsetWidth)
      if (i !== current) setCurrent(i)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [current])

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      goTo(current + 1)
    } else {
      navigate('/signup')
    }
  }

  return (
    <div className="onb">
      {/* Top bar */}
      <header className="onb__top">
        {onBack ? (
          <button type="button" className="onb__back" onClick={onBack}>
            <MaterialIcon name="arrow_back" size={18} /> Back
          </button>
        ) : (
          <span aria-hidden="true" />
        )}

        <div className="onb__brand">
          <Logo size={22} color="var(--color-primary)" title="" />
          <span>Halaq</span>
        </div>

        {current < SLIDES.length - 1 ? (
          <button type="button" className="onb__skip" onClick={() => goTo(SLIDES.length - 1)}>
            Skip
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </header>

      {/* Slides */}
      <div className="onb__track" ref={trackRef}>
        {SLIDES.map((slide, i) => (
          <article
            key={slide.title}
            className={`onb__slide ${i === current ? 'is-active' : ''}`}
            aria-hidden={i !== current}
          >
            <div className="onb__art">
              <slide.Illustration size={300} />
            </div>

            <div className="onb__copy">
              <span className="onb__eyebrow">{slide.eyebrow}</span>
              <h1>
                {renderTitle(slide.title, slide.titleHighlight)}
              </h1>
              <p>{slide.body}</p>
            </div>
          </article>
        ))}
      </div>

      {/* Footer */}
      <footer className="onb__footer">
        <div className="onb__dots" role="tablist" aria-label="Onboarding progress">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`onb__dot ${i === current ? 'is-active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Go to step ${i + 1}`}
              aria-selected={i === current}
              role="tab"
            />
          ))}
        </div>

        <div className="onb__cta">
          {current === SLIDES.length - 1 ? (
            <>
              <button type="button" className="btn btn-primary btn--lg btn--block" onClick={() => navigate('/signup')}>
                Create free account
              </button>
              <button type="button" className="btn btn-ghost btn--block" onClick={() => navigate('/login')}>
                I already have an account
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary btn--lg btn--block" onClick={handleNext}>
              Next <MaterialIcon name="arrow_forward" size={18} />
            </button>
          )}
        </div>

        <p className="onb__foot-note">No credit card. No data sold. Guidance only — not a fatwa.</p>
      </footer>
    </div>
  )
}

function renderTitle(title, highlight) {
  if (!highlight) return title
  const idx = title.toLowerCase().indexOf(highlight.toLowerCase())
  if (idx === -1) return title
  return (
    <>
      {title.slice(0, idx)}
      <span className="text-primary">{title.slice(idx, idx + highlight.length)}</span>
      {title.slice(idx + highlight.length)}
    </>
  )
}
