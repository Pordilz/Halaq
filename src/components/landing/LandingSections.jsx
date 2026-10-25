import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import SampleReport from './SampleReport'
import { LANDING_SAMPLES } from '../../content/landingSamples'
import { screenStock, calculateHoldingPurification } from '../../services/complianceEngine'
import coinWeight from '../../assets/landing/coin-weight.jpg'
import dinar from '../../assets/landing/dinar-of-sanjar.jpg'

// Apple's real AAOIFI report drives the four-test walkthrough and the
// purification tile, so the figures match the sample report exactly.
const apple = LANDING_SAMPLES.find(s => s.profile.ticker === 'AAPL')
const appleReport = screenStock(apple.profile, apple.balanceSheet, apple.income, { methodology: 'AAOIFI' })
const appleRatio = key => appleReport.financialScreen.ratios.find(r => r.key === key)
const applePurification = calculateHoldingPurification({
  shares: 100,
  dividendPerShare: apple.profile.dividendRate,
  haramRevenuePercent: appleReport.haramRevenuePercent,
})
const pct = value => `${(value * 100).toFixed(2)}%`
const usd = value => `$${value.toFixed(2)}`

const TESTS = [
  { clause: 'First, what the company sells.', field: 'mint' },
  { clause: 'Then, how much it owes.', field: 'green', row: { name: 'Debt', ratio: appleRatio('leverage'), basis: 'of market value' } },
  { clause: 'Then, the cash it holds at interest.', field: 'gold', row: { name: 'Cash at interest', ratio: appleRatio('liquidity'), basis: 'of market value' } },
  { clause: 'Last, what it earns from interest.', field: 'night', row: { name: 'Interest income', ratio: appleRatio('haramIncome'), basis: 'of revenue' } },
]

const EXCHANGES = [
  'Nasdaq', 'NYSE', 'London', 'Xetra', 'Euronext', 'SIX Swiss', 'Saudi Exchange', 'Boursa Kuwait',
  'Johannesburg', 'Jakarta', 'Tokyo', 'Hong Kong', 'Korea Exchange', 'ASX', 'Toronto',
]

const STANDARDS = [
  { name: 'AAOIFI', rule: '30% debt, 30% cash, 5% income. The default.' },
  { name: 'S&P', rule: '30% lines, on 36 months of market value' },
  { name: 'Dow Jones', rule: '30% lines, on 24 months of market value' },
  { name: 'FTSE', rule: '33% lines, measured against total assets' },
]

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    lines: ['50 screens a day, 10 without an account', 'AAOIFI verdicts', 'A watchlist, re-screened daily'],
    action: { label: 'Create an account', to: '/signup' },
    tone: 'mint',
  },
  {
    name: 'Pro',
    price: '$9',
    period: 'a month',
    lines: [
      'Unlimited screens',
      'The full ratio and business breakdown',
      'Purification calculator',
      'Any of the four standards',
      'Batch screening and ETF X-Ray',
    ],
    action: { label: 'Choose Pro', to: '/upgrade?tier=pro' },
    tone: 'green',
  },
  {
    name: 'Scholar',
    price: '$29',
    period: 'a month',
    lines: ['For advisers who screen for others.', 'Everything in Pro, with priority email support.'],
    action: { label: 'Choose Scholar', to: '/upgrade?tier=scholar' },
    tone: 'night',
  },
]

const QUESTIONS = [
  {
    q: 'Is a verdict a fatwa?',
    a: 'No. Halaq applies published standards to public financial data. It is guidance, not a fatwa and not financial advice. For a ruling on your own investments, ask a qualified scholar.',
  },
  {
    q: 'Where do the numbers come from?',
    a: 'Yahoo Finance: the latest balance sheet and the last twelve months of income. Every report shows the date of its statements and of the price it used.',
  },
  {
    q: 'What if a figure is missing?',
    a: 'The stock is marked Unverified. Halaq never counts a missing number as zero, and an estimate on its own cannot fail a stock.',
  },
  {
    q: 'Which standard should I use?',
    a: 'AAOIFI is the one most scholars cite, and it is the default. If your scholar or fund follows S&P, Dow Jones or FTSE, Pro lets you switch.',
  },
  {
    q: 'How is purification worked out?',
    a: `Your dividends times the company’s interest income as a share of its revenue. 100 Apple shares pay ${usd(applePurification.dividends)} a year; ${pct(appleReport.haramRevenuePercent)} of that, ${usd(applePurification.amount)}, goes to charity.`,
  },
  {
    q: 'What does Verify do?',
    a: 'A quick screen uses today’s market value. When a saved stock is unverified or needs review, Verify checks it again on a 24-month average, as the index providers do, so one bad week cannot decide it.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. You can screen 10 stocks a day without one. A free account gives you 50 a day and a watchlist.',
  },
]

function Bar({ ratio }) {
  return (
    <span className="lp-card__bar" aria-hidden="true">
      <span style={{ transform: `scaleX(${Math.min(ratio.ratio / (ratio.threshold * 2), 1)})` }} />
      <span className="lp-card__mark" />
    </span>
  )
}

// One copy of Apple's report card, filled in up to `stage` (0–3).
function TestCard({ stage }) {
  return (
    <div className="lp-card" data-ui aria-hidden="true">
      <p className="lp-card__name">Apple Inc.</p>
      <p className="lp-card__meta">AAPL on Nasdaq</p>
      <dl>
        <div>
          <dt>What it sells</dt>
          <dd>{appleReport.industry} <b>Permitted</b></dd>
        </div>
        {TESTS.slice(1, stage + 1).map(t => (
          <div key={t.row.name}>
            <dt>{t.row.name}</dt>
            <dd>
              {pct(t.row.ratio.ratio)} {t.row.basis} <b>under {pct(t.row.ratio.threshold).replace('.00', '')}</b>
            </dd>
            <Bar ratio={t.row.ratio} />
          </div>
        ))}
      </dl>
      {stage === 3 && <p className="lp-card__verdict">Compliant</p>}
    </div>
  )
}

function Arrow() {
  return (
    <svg className="lp-foot__arrow" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M10 38 38 10M16 10h22v22" fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
  )
}

// Everything below the hero. Loaded after first paint so the compliance
// engine and the sample data stay out of the landing page's first bundle.
export default function LandingSections() {
  const root = useRef(null)

  // Section entrances run once; the marquee only moves while it is on screen.
  useEffect(() => {
    const el = root.current
    if (!el || !('IntersectionObserver' in window)) {
      el?.querySelectorAll('[data-reveal]').forEach(n => n.classList.add('is-in'))
      return undefined
    }
    const reveal = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          reveal.unobserve(e.target)
        }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 })
    el.querySelectorAll('[data-reveal]').forEach(n => reveal.observe(n))

    const band = el.querySelector('.lp-proof__track')
    const running = new IntersectionObserver(([e]) => band?.classList.toggle('is-running', e.isIntersecting))
    if (band) running.observe(band)
    return () => {
      reveal.disconnect()
      running.disconnect()
    }
  }, [])

  return (
    <div ref={root}>
      <section className="lp-how" aria-labelledby="lp-how-title">
        {TESTS.map((t, stage) => (
          <div key={t.clause} className={`lp-how__field lp-field--${t.field}`}>
            {stage === 0 && <h2 id="lp-how-title" className="lp-how__title">Four tests decide it</h2>}
            <div className="lp-how__card" data-reveal style={{ '--i': stage }}>
              <TestCard stage={stage} />
            </div>
            <p className="lp-how__clause">{t.clause}</p>
          </div>
        ))}
      </section>

      <section className="lp-show" aria-label="Sample reports">
        <SampleReport />
      </section>

      <section className="lp-board" aria-labelledby="lp-board-title">
        <div className="lp-tile lp-tile--head lp-field--night" data-reveal style={{ '--i': 0 }}>
          <h2 id="lp-board-title" className="lp-board__title">After the verdict</h2>
        </div>
        <div className="lp-tile lp-tile--wide lp-field--mint" data-reveal style={{ '--i': 1 }}>
          <div className="lp-ui lp-ui--switch" data-ui aria-hidden="true">
            <span className="is-on">AAOIFI</span><span>S&amp;P</span><span>Dow Jones</span><span>FTSE</span>
          </div>
          <p className="lp-tile__cap"><strong>Your standard</strong>Switch between all four with Pro.</p>
        </div>
        <div className="lp-tile lp-tile--big lp-field--green" data-reveal style={{ '--i': 2 }}>
          <div className="lp-ui lp-ui--readout" data-ui aria-hidden="true">
            <span>Give to charity</span>
            <strong>{usd(applePurification.amount)}</strong>
            <span>from {usd(applePurification.dividends)} of Apple dividends</span>
          </div>
          <p className="lp-tile__cap"><strong>Purification</strong>What to give away from each dividend.</p>
        </div>
        <div className="lp-tile lp-tile--tall lp-field--gold" data-reveal style={{ '--i': 3 }}>
          <div className="lp-ui lp-ui--change" data-ui aria-hidden="true">
            <span className="lp-ui__badge lp-ui__badge--fail">Non-compliant</span>
            <span className="lp-ui__was">Was Compliant</span>
          </div>
          <p className="lp-tile__cap"><strong>Watchlist</strong>Saved stocks are re-screened every day.</p>
        </div>
        <div className="lp-tile lp-tile--tall lp-field--step" data-reveal style={{ '--i': 4 }}>
          <div className="lp-ui lp-ui--batch" data-ui aria-hidden="true">
            <span><b>AAPL</b><em className="pass">Compliant</em></span>
            <span><b>COST</b><em className="review">Needs review</em></span>
            <span><b>HEIA.AS</b><em className="fail">Non-compliant</em></span>
          </div>
          <p className="lp-tile__cap"><strong>Batch screening</strong>Up to 20 tickers at once, with Pro.</p>
        </div>
        <div className="lp-tile lp-field--night" data-reveal style={{ '--i': 5 }}>
          <div className="lp-ui lp-ui--fund" data-ui aria-hidden="true">
            <b>SPUS</b>
            <span>Dedicated Shariah fund</span>
          </div>
          <p className="lp-tile__cap"><strong>ETF X-Ray</strong>How much of a fund’s top holdings pass.</p>
        </div>
        <div className="lp-tile lp-field--mint" data-reveal style={{ '--i': 6 }}>
          <div className="lp-ui lp-ui--verify" data-ui aria-hidden="true">
            <span>Verify</span>
          </div>
          <p className="lp-tile__cap"><strong>Verify</strong>A second look on 24 months of prices.</p>
        </div>
        <div className="lp-tile lp-tile--wide lp-field--gold" data-reveal style={{ '--i': 7 }}>
          <div className="lp-ui lp-ui--gap" data-ui aria-hidden="true">
            <span className="lp-ui__badge lp-ui__badge--unknown">Unverified</span>
            <span>Cash at interest: data unavailable</span>
          </div>
          <p className="lp-tile__cap"><strong>No guesswork</strong>A missing figure is never counted as zero.</p>
        </div>
      </section>

      <section className="lp-proof" aria-label="Exchanges">
        <div className="lp-proof__band">
          <div className="lp-proof__track">
            {[0, 1].map(copy => (
              <p key={copy} className="lp-proof__names" aria-hidden={copy === 1 ? 'true' : undefined}>
                {EXCHANGES.map(name => (
                  <span key={name}>{name}<span className="lp-proof__dot" /></span>
                ))}
              </p>
            ))}
          </div>
        </div>
        <p className="lp-proof__note">
          Halaq screens companies listed on these exchanges, and others, from their own published statements.
        </p>
      </section>

      <section className="lp-standards" aria-label="Standards">
        <ul className="lp-standards__list">
          {STANDARDS.map((s, i) => (
            <li key={s.name} data-reveal style={{ '--i': i }}>
              <span className="lp-standards__name">{s.name}</span>
              <span className="lp-standards__rule">{s.rule}</span>
            </li>
          ))}
        </ul>
        <div className="lp-standards__foot">
          <p className="lp-standards__note">
            The four published standards. Free accounts screen under AAOIFI; Pro lets you choose.
          </p>
          <figure className="lp-object lp-object--weight" data-reveal>
            <img src={coinWeight} width="760" height="760" loading="lazy" decoding="async"
              alt="A pale green glass disc, stamped with Arabic script, worn at the edges" />
            <figcaption>
              Glass coin weight, Egypt, 808–810. At 5.7 grams, it let a market check coins against a fixed
              standard. The Met, public domain.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="lp-plans" aria-labelledby="lp-plans-title">
        <h2 id="lp-plans-title" className="lp-plans__title">Free to start</h2>
        {PLANS.map((p, i) => (
          <article key={p.name} className={`lp-plan lp-plan--${i} lp-field--${p.tone}`} data-reveal style={{ '--i': i }}>
            <h3 className="lp-plan__name">{p.name}</h3>
            <p className="lp-plan__price">
              {p.price}
              {p.period && <span> {p.period}</span>}
            </p>
            <ul className="lp-plan__lines">
              {p.lines.map(l => <li key={l}>{l}</li>)}
            </ul>
            <Link to={p.action.to} className="lp-plan__action">{p.action.label}</Link>
          </article>
        ))}
      </section>

      <section className="lp-faq" aria-labelledby="lp-faq-title">
        <div className="lp-faq__head lp-field--green">
          <h2 id="lp-faq-title" className="lp-faq__title">Questions</h2>
          <figure className="lp-object lp-object--dinar" data-reveal>
            <img src={dinar} width="860" height="860" loading="lazy" decoding="async"
              alt="A gold coin with rows of Arabic inscription inside a ring of script" />
            <figcaption>Gold dinar of Sanjar, struck at Nishapur in 1099. The Met, public domain.</figcaption>
          </figure>
        </div>
        {QUESTIONS.map(item => (
          <div key={item.q} className="lp-faq__band">
            <h3 className="lp-faq__q" data-reveal>{item.q}</h3>
            <p className="lp-faq__a" data-reveal style={{ '--i': 1 }}>{item.a}</p>
          </div>
        ))}
      </section>

      <footer className="lp-foot">
        <div className="lp-foot__tile lp-foot__tile--statement">
          <p>Guidance, not a fatwa. Check your own holdings with a qualified scholar.</p>
          <small>
            © 2026 Halaq. Pictures:{' '}
            <a href="https://www.metmuseum.org/art/collection/search/453506" target="_blank" rel="noreferrer">Coin Weight</a>, 808–810, and{' '}
            <a href="https://www.metmuseum.org/art/collection/search/457275" target="_blank" rel="noreferrer">Dinar of Sanjar</a>, 1099,{' '}
            <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noreferrer">public domain (CC0)</a>, via The Metropolitan Museum of Art.
          </small>
        </div>
        <nav className="lp-foot__tile lp-foot__tile--nav" aria-label="Site">
          <Link to="/screener">Screener</Link>
          <Link to="/learn">Learn</Link>
          <Link to="/upgrade">Plans</Link>
          <Link to="/login">Sign in</Link>
          <Link to="/legal/privacy">Privacy</Link>
          <Link to="/legal/terms">Terms</Link>
          <Link to="/legal/disclaimer">Disclaimer</Link>
          <Link to="/legal/data-sources">Data sources</Link>
        </nav>
        <div className="lp-foot__tile lp-foot__tile--standards">
          <a href="https://aaoifi.com" target="_blank" rel="noreferrer">AAOIFI</a>
          <a href="https://www.spglobal.com/spdji/en/index-family/shariah/" target="_blank" rel="noreferrer">S&amp;P Shariah</a>
          <a href="https://www.spglobal.com/spdji/en/index-family/equity/global-equity/dow-jones-islamic-market/" target="_blank" rel="noreferrer">Dow Jones Islamic</a>
          <a href="https://www.lseg.com/en/ftse-russell/indices/global-shariah" target="_blank" rel="noreferrer">FTSE Shariah</a>
        </div>
        <div className="lp-foot__tile lp-foot__tile--mail">
          <a href="mailto:qromatech@gmail.com">qromatech@gmail.com</a>
        </div>
        <p className="lp-foot__tile lp-foot__tile--name" aria-hidden="true">Halaq</p>
        <Link to="/screener" className="lp-foot__tile lp-foot__tile--go">
          Screen a stock
          <Arrow />
        </Link>
      </footer>
    </div>
  )
}
