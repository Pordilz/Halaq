import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { screenStock } from '../../services/complianceEngine'
import { LANDING_SAMPLES, SAMPLES_AS_OF } from '../../content/landingSamples'

const STANDARDS = [
  { key: 'AAOIFI', label: 'AAOIFI' },
  { key: 'SP', label: 'S&P' },
  { key: 'DJIM', label: 'Dow Jones' },
  { key: 'FTSE', label: 'FTSE' },
]

const EXCHANGES = { NasdaqGS: 'Nasdaq', Swiss: 'SIX Swiss', Jakarta: 'Indonesia Stock Exchange', Amsterdam: 'Euronext Amsterdam' }

const VERDICTS = {
  COMPLIANT: { label: 'Compliant', tone: 'pass' },
  NON_COMPLIANT: { label: 'Non-compliant', tone: 'fail' },
  REVIEW_REQUIRED: { label: 'Needs review', tone: 'review' },
  UNVERIFIED: { label: 'Unverified', tone: 'unknown' },
}

const RATIO_LABELS = {
  leverage: 'Debt',
  liquidity: 'Cash at interest',
  receivables: 'Receivables and cash',
  haramIncome: 'Interest income',
}

const pct = value => `${(value * 100).toFixed(2)}%`
const line = value => `${+(value * 100).toFixed(2)}%`

function day(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function price(profile) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: profile.currency,
    maximumFractionDigits: profile.regularMarketPrice >= 1000 ? 0 : 2,
  }).format(profile.regularMarketPrice)
}

function basisOf(ratio) {
  if (ratio.key === 'haramIncome') return 'of revenue'
  return ratio.denominator === 'totalAssets' ? 'of total assets' : 'of market value'
}

function reason(sample, result) {
  const industry = (result.industry || 'its industry').toLowerCase()
  const over = result.financialScreen.ratios.filter(r => r.pass === false)
  const first = over[0]
  const overText = first && `${RATIO_LABELS[first.key]} is ${pct(first.ratio)} ${basisOf({ ...first, denominator: result.financialScreen.denominator })}; the line is ${line(first.threshold)}.`
  switch (result.status) {
    case 'COMPLIANT':
      return `${sample.displayName} passes every test under ${STANDARDS.find(s => s.key === result.methodologyKey)?.label || 'this standard'}.`
    case 'NON_COMPLIANT':
      if (result.businessScreen.status === 'FAIL') {
        return `It fails the business test (${result.industry}).${first ? ` ${overText}` : ''}`
      }
      return overText || result.statusReason
    case 'REVIEW_REQUIRED':
      return `Its figures pass, but ${industry} can include impermissible sales, so it needs a closer look.`
    default:
      return 'A figure is missing, so Halaq will not give a verdict.'
  }
}

// Why each sample is on the page, in figures from the engine itself.
function leverage(sample, methodology) {
  const r = screenStock(sample.profile, sample.balanceSheet, sample.income, { methodology })
  return pct(r.financialScreen.ratios.find(x => x.key === 'leverage').ratio)
}

const WHY = {
  AAPL: s => `Passes every standard with room to spare: its debt is ${leverage(s, 'AAOIFI')} of its market value.`,
  'NESN.SW': s => `Passes AAOIFI with debt at ${leverage(s, 'AAOIFI')} of market value, then fails FTSE, which measures debt against total assets.`,
  'TLKM.JK': s => `Fails AAOIFI with debt at ${leverage(s, 'AAOIFI')} of market value, and passes FTSE at ${leverage(s, 'FTSE')} of total assets.`,
  COST: () => 'The verdict Halaq leaves to you: the ratios pass, and a store’s revenue mix needs a human look.',
  'HEIA.AS': s => `Fails twice: it brews beer, and its debt is ${leverage(s, 'AAOIFI')} of its market value.`,
}

function Ratio({ ratio, denominator }) {
  const missing = ratio.ratio == null
  // The bar runs from 0 to twice the line, so the line always sits halfway.
  const fill = missing ? 0 : Math.min(ratio.ratio / (ratio.threshold * 2), 1)
  return (
    <li className={`lp-report__ratio${ratio.pass === false ? ' is-over' : ''}`}>
      <span className="lp-report__ratio-name">{RATIO_LABELS[ratio.key]}</span>
      <span className="lp-report__ratio-figure">
        {missing ? 'No data' : pct(ratio.ratio)}
        <span> {basisOf({ ...ratio, denominator })}, line {line(ratio.threshold)}</span>
      </span>
      <span className="lp-report__bar" aria-hidden="true">
        <span className="lp-report__fill" style={{ transform: `scaleX(${fill})` }} />
        <span className="lp-report__line" />
      </span>
    </li>
  )
}

export default function SampleReport() {
  const [ticker, setTicker] = useState(LANDING_SAMPLES[1].profile.ticker)
  const [standard, setStandard] = useState('AAOIFI')
  const sample = LANDING_SAMPLES.find(s => s.profile.ticker === ticker)

  const result = useMemo(
    () => screenStock(sample.profile, sample.balanceSheet, sample.income, { methodology: standard }),
    [sample, standard]
  )
  const verdict = VERDICTS[result.status] || VERDICTS.UNVERIFIED
  const business = result.businessScreen.status
  const purifies = result.status === 'COMPLIANT' && result.haramRevenuePercent != null

  return (
    <div className="lp-show__grid">
      <div className="lp-show__index">
        <ul className="lp-show__names" aria-label="Sample reports">
          {LANDING_SAMPLES.map((s, i) => (
            <li key={s.profile.ticker} data-reveal style={{ '--i': i }}>
              <button
                type="button"
                className="lp-show__name"
                aria-pressed={s.profile.ticker === ticker}
                onClick={() => setTicker(s.profile.ticker)}
              >
                {s.displayName}
              </button>
            </li>
          ))}
        </ul>
        <p className="lp-show__why" key={ticker}>{WHY[ticker]?.(sample)}</p>
        <p className="lp-show__note" data-reveal style={{ '--i': 5 }}>
          Real reports from the {SAMPLES_AS_OF} close. Pick a company, then a standard.
        </p>
      </div>

      <div className="lp-show__stage">
        <div className="lp-show__paper">
          <article className="lp-report" data-ui key={ticker} aria-live="polite">
            <header className="lp-report__head">
              <div>
                <h3 className="lp-report__name">{sample.profile.name}</h3>
                <p className="lp-report__meta">
                  {sample.profile.ticker} on {EXCHANGES[sample.profile.exchange] || sample.profile.exchange}
                </p>
              </div>
              <p className="lp-report__price">{price(sample.profile)}</p>
            </header>

            <div className={`lp-report__verdict lp-report__verdict--${verdict.tone}`} key={`${ticker}-${standard}`}>
              <span className="lp-report__badge">{verdict.label}</span>
              <p>{reason(sample, result)}</p>
            </div>

            <div className="lp-report__standards" role="group" aria-label="Screening standard">
              {STANDARDS.map(s => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={s.key === standard}
                  onClick={() => setStandard(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <ul className="lp-report__tests">
              <li className={`lp-report__ratio${business === 'FAIL' ? ' is-over' : ''}`}>
                <span className="lp-report__ratio-name">What it sells</span>
                <span className="lp-report__ratio-figure">
                  {result.industry}
                  <span> {business === 'PASS' ? 'Permitted' : business === 'FAIL' ? 'Not permitted' : 'Mixed, needs review'}</span>
                </span>
              </li>
              {result.financialScreen.ratios.map(r => (
                <Ratio key={r.key} ratio={r} denominator={result.financialScreen.denominator} />
              ))}
            </ul>

            <p className="lp-report__purify">
              {purifies
                ? `Purification: give ${pct(result.haramRevenuePercent)} of each dividend to charity.`
                : 'Purification: not applicable, as the stock does not pass.'}
            </p>

            <footer className="lp-report__foot">
              <p>
                Statements for the twelve months to {day(sample.income.period)}. Market value at the{' '}
                {SAMPLES_AS_OF} close. Data from Yahoo Finance.
              </p>
              <Link to={`/stock/${encodeURIComponent(sample.profile.ticker)}`}>Open the live report</Link>
            </footer>
          </article>
        </div>
      </div>
    </div>
  )
}
