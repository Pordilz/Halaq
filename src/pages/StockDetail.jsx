import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWatchlist } from '../hooks/useWatchlist'
import { fetchAllScreeningData } from '../services/yahooFinanceApi'
import { screenStock, getCurrencySymbol } from '../services/complianceEngine'
import MaterialIcon from '../components/MaterialIcon'
import RatioBar from '../components/RatioBar'
import ComplianceBadge from '../components/ComplianceBadge'
import DisclaimerNotice from '../components/DisclaimerNotice'
import useDocumentTitle from '../hooks/useDocumentTitle'
import './StockDetail.css'

// Migration 007 split the old DOUBTFUL bucket into REVIEW_REQUIRED (mixed
// business — needs human judgement of revenue mix) and UNVERIFIED (data
// gaps — auto-resolvable via the Verify flow). DOUBTFUL is kept as a
// deprecated alias so cached client state still renders sensibly.
const STATUS_TONE = {
  COMPLIANT: { className: 'sd-banner--compliant', icon: 'check_circle', label: 'COMPLIANT' },
  NON_COMPLIANT: { className: 'sd-banner--non', icon: 'cancel', label: 'NON-COMPLIANT' },
  REVIEW_REQUIRED: { className: 'sd-banner--doubtful', icon: 'rule', label: 'REVIEW REQUIRED' },
  UNVERIFIED: { className: 'sd-banner--doubtful', icon: 'sync_problem', label: 'UNVERIFIED' },
  DOUBTFUL: { className: 'sd-banner--doubtful', icon: 'sync_problem', label: 'UNVERIFIED' },
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'ratios', label: 'Ratios' },
  { id: 'business', label: 'Business' },
  { id: 'purification', label: 'Purification' },
]

const formatNumber = (n, currency, compact = true) => {
  if (!Number.isFinite(n) || n === 0) return '—'
  const symbol = getCurrencySymbol(currency)
  if (compact) {
    const abs = Math.abs(n)
    if (abs >= 1e12) return `${symbol}${(n / 1e12).toFixed(2)}T`
    if (abs >= 1e9) return `${symbol}${(n / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `${symbol}${(n / 1e6).toFixed(2)}M`
    if (abs >= 1e3) return `${symbol}${(n / 1e3).toFixed(2)}K`
  }
  return `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export default function StockDetail() {
  const { ticker } = useParams()
  const { user, isPro, profile } = useAuth()
  const navigate = useNavigate()
  const { isInWatchlist, toggle, updateStatus } = useWatchlist(user)

  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [stock, setStock] = useState(null)
  const [error, setError] = useState(null)
  const [shareNotice, setShareNotice] = useState(null)

  useDocumentTitle(stock ? `${stock.ticker} — ${stock.name}` : ticker)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAllScreeningData(ticker, { signal: controller.signal })
        if (cancelled) return
        // Pro+ users get to pick a methodology in Profile. Free users always
        // get AAOIFI (the default in screenStock when the option is omitted
        // or unrecognised).
        const methodology = isPro ? profile?.methodology : undefined
        const compliance = screenStock(data.profile, data.balanceSheet, data.income, { methodology })

        const currency = compliance.currency || 'USD'
        const symbol = getCurrencySymbol(currency)
        const rawPrice = Number(data.profile.regularMarketPrice) || 0
        const formattedPrice = rawPrice > 0
          ? `${symbol}${rawPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : null

        const changePct = Number(data.profile.regularMarketChangePercent)
        const formattedChange = Number.isFinite(changePct) && changePct !== 0
          ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
          : null

        setStock({
          ticker: compliance.ticker,
          name: compliance.companyName,
          sector: compliance.sector,
          industry: compliance.industry,
          exchange: compliance.exchange,
          country: data.profile.country,
          website: data.profile.website,
          description: data.profile.description,
          currency,
          marketCap: compliance.marketCap,
          price: formattedPrice,
          change: formattedChange,
          changePositive: Number.isFinite(changePct) ? changePct >= 0 : null,
          fiftyTwoWeekLow: data.profile.fiftyTwoWeekLow,
          fiftyTwoWeekHigh: data.profile.fiftyTwoWeekHigh,
          status: compliance.status,
          statusReason: compliance.statusReason,
          methodology: compliance.methodology,
          ratios: compliance.financialScreen.ratios,
          business: compliance.businessScreen,
          haramRevenuePercent: compliance.haramRevenuePercent || 0,
          dataSources: compliance.dataSources,
          income: data.income,
          balanceSheet: data.balanceSheet,
          quoteFetchedAt: Date.now(),
        })

        // Sync watchlist compliance status (live counts on Home/Watchlist)
        if (isInWatchlist(ticker)) {
          updateStatus(ticker, compliance.status)
        }
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Re-screen if methodology changes (Pro switches AAOIFI → DJIM, etc.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, isPro, profile?.methodology])

  if (loading) {
    return (
      <div className="sd-page container">
        <button onClick={() => navigate(-1)} className="sd-back">
          <MaterialIcon name="arrow_back" size={18} /> Back
        </button>
        <div className="sd-skel sd-skel-hero" />
        <div className="sd-skel sd-skel-banner" />
        <div className="sd-skel sd-skel-tabs" />
        <div className="sd-skel sd-skel-content" />
      </div>
    )
  }

  if (error || !stock) {
    return (
      <div className="sd-page container sd-error">
        <MaterialIcon name="error_outline" size={48} className="text-error" />
        <h2 className="text-h2">We couldn't load {ticker}</h2>
        <p className="text-on-surface-variant">{error || 'Unknown error fetching data.'}</p>
        <div className="sd-error__actions">
          <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/screener')}>Back to screener</button>
        </div>
      </div>
    )
  }

  const tone = STATUS_TONE[stock.status] || STATUS_TONE.UNVERIFIED
  const inList = isInWatchlist(stock.ticker)

  const handleShare = async () => {
    const url = `${window.location.origin}/stock/${stock.ticker}`
    const title = `${stock.ticker} — ${stock.name} compliance report`
    // Always clear any prior toast first so a stale "Link copied" doesn't
    // hang around when the native share sheet appears.
    setShareNotice(null)
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShareNotice('Link copied')
      setTimeout(() => setShareNotice(null), 2400)
    } catch {/* user cancelled or denied */}
  }

  return (
    <div className="sd-page container animate-entrance">
      <button onClick={() => navigate(-1)} className="sd-back">
        <MaterialIcon name="arrow_back" size={18} /> Back
      </button>

      <header className="sd-hero">
        <div className="sd-hero__left">
          <span className="sd-hero__ticker">{stock.ticker}</span>
          <h1 className="sd-hero__name">{stock.name}</h1>
          <div className="sd-hero__meta">
            {stock.industry || stock.sector || 'Sector unavailable'}
            {stock.exchange && (
              <>
                <span className="sd-dot" />
                {stock.exchange}
              </>
            )}
            {stock.country && (
              <>
                <span className="sd-dot" />
                {stock.country}
              </>
            )}
          </div>
        </div>
        {stock.price && (
          <div className="sd-hero__right">
            <div className="sd-hero__price">{stock.price}</div>
            {stock.change && (
              <div className={`sd-hero__change ${stock.changePositive ? 'sd-hero__change--up' : 'sd-hero__change--down'}`}>
                <MaterialIcon name={stock.changePositive ? 'trending_up' : 'trending_down'} size={16} />
                {stock.change}
              </div>
            )}
            {stock.quoteFetchedAt && (
              <QuoteFreshness fetchedAt={stock.quoteFetchedAt} />
            )}
          </div>
        )}
      </header>

      <div className={`sd-banner ${tone.className}`}>
        <div className="sd-banner__icon">
          <MaterialIcon name={tone.icon} fill size={32} />
        </div>
        <div className="sd-banner__body">
          <span className="sd-banner__label">{stock.methodology} verdict</span>
          <span className="sd-banner__verdict">{tone.label}</span>
          <span className="sd-banner__reason">{stock.statusReason}</span>
          {(stock.status === 'UNVERIFIED' || stock.status === 'DOUBTFUL') && (
            <span className="sd-banner__hint">
              <MaterialIcon name="info" size={14} />
              "Unverified" means Halaq could not fetch enough reliable
              financial data to give a confident verdict — usually a missing
              balance-sheet line item. It is not a "fail." For US tickers,
              the Verify flow can re-fetch directly from SEC EDGAR filings.
            </span>
          )}
          {stock.status === 'REVIEW_REQUIRED' && (
            <span className="sd-banner__hint">
              <MaterialIcon name="info" size={14} />
              This stock passes every financial ratio but operates in a
              mixed-business industry (hotels, media, etc.) where some of
              the revenue may be non-permissible. Halaq cannot make this
              judgement for you — review the company's revenue mix before
              acting.
            </span>
          )}
        </div>
        <div className="sd-banner__actions">
          <button
            type="button"
            className="btn btn-on-glass btn--sm"
            onClick={() => toggle({ ticker: stock.ticker, name: stock.name, sector: stock.sector, exchange: stock.exchange, status: stock.status })}
          >
            <MaterialIcon name={inList ? 'bookmark' : 'bookmark_add'} fill={inList} size={16} />
            {inList ? 'Saved' : 'Watchlist'}
          </button>
          <button type="button" className="btn btn-on-glass btn--sm" onClick={handleShare}>
            <MaterialIcon name="share" size={16} />
            {shareNotice || 'Share'}
          </button>
        </div>
      </div>

      {/* Quick stats grid */}
      <section className="sd-stats">
        <Stat label="Market cap" value={formatNumber(stock.marketCap, stock.currency)} />
        <Stat label="52-week range" value={
          stock.fiftyTwoWeekLow > 0 && stock.fiftyTwoWeekHigh > 0
            ? `${formatNumber(stock.fiftyTwoWeekLow, stock.currency, false)} – ${formatNumber(stock.fiftyTwoWeekHigh, stock.currency, false)}`
            : '—'
        } />
        <Stat label="Total debt" value={formatNumber(stock.balanceSheet.totalDebt, stock.currency)} />
        <Stat label="Revenue (FY)" value={formatNumber(stock.income.revenue, stock.currency)} />
      </section>

      <div className="sd-tabs" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`sd-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="sd-pane">
        {activeTab === 'overview' && <Overview stock={stock} isPro={isPro} navigate={navigate} />}
        {activeTab === 'ratios' && <Ratios stock={stock} isPro={isPro} navigate={navigate} />}
        {activeTab === 'business' && <Business stock={stock} isPro={isPro} navigate={navigate} />}
        {activeTab === 'purification' && <Purification stock={stock} isPro={isPro} navigate={navigate} />}
      </div>

      <div className="sd-mobile-foot">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => toggle({ ticker: stock.ticker, name: stock.name, sector: stock.sector, exchange: stock.exchange, status: stock.status })}
        >
          <MaterialIcon name={inList ? 'bookmark' : 'bookmark_add'} fill={inList} size={18} />
          {inList ? 'Saved' : 'Watchlist'}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleShare}>
          <MaterialIcon name="share" size={18} />
          {shareNotice || 'Share'}
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="sd-stat">
      <span className="sd-stat__label">{label}</span>
      <span className="sd-stat__value">{value}</span>
    </div>
  )
}

function PremiumGate({ navigate, body }) {
  return (
    <div className="sd-gate">
      <MaterialIcon name="lock" fill className="text-primary" size={36} />
      <h3 className="text-h3">Premium feature</h3>
      <p className="text-on-surface-variant">{body}</p>
      <button type="button" className="btn btn-primary" onClick={() => navigate('/upgrade?tier=pro')}>
        Upgrade to Pro
      </button>
    </div>
  )
}

function Overview({ stock, isPro, navigate }) {
  const haramPct = (stock.haramRevenuePercent || 0) * 100
  // Friendly label for the verdict in the summary sentence. Matches what
  // the banner badge shows so the page reads consistently.
  const verdictWords = {
    COMPLIANT: 'compliant',
    NON_COMPLIANT: 'non-compliant',
    REVIEW_REQUIRED: 'in need of review',
    UNVERIFIED: 'unverified',
    DOUBTFUL: 'unverified',
  }[stock.status] || 'pending review'
  return (
    <div className="sd-card">
      <h3 className="sd-card__title">Summary</h3>
      <p className="sd-card__copy">
        <strong>{stock.name}</strong> is currently <strong>{verdictWords}</strong>{' '}
        under {stock.methodology}, based on financials reported{' '}
        {stock.dataSources.balanceSheetPeriod ? `up to ${stock.dataSources.balanceSheetPeriod}` : 'recently'}.
      </p>

      <div className="sd-overview-grid">
        <OverviewCell
          tone={stock.business.status === 'PASS' ? 'tertiary' : stock.business.status === 'FAIL' ? 'error' : 'caution'}
          icon={stock.business.status === 'PASS' ? 'verified' : stock.business.status === 'FAIL' ? 'block' : 'help'}
          label="Business activity"
          value={stock.business.status === 'PASS' ? 'Permissible' : stock.business.status === 'FAIL' ? 'Non-permissible' : 'Mixed'}
        />
        <OverviewCell
          tone={stock.ratios.every(r => r.pass) ? 'tertiary' : 'error'}
          icon={stock.ratios.every(r => r.pass) ? 'check_circle' : 'cancel'}
          label="Financial ratios"
          value={`${stock.ratios.filter(r => r.pass).length}/${stock.ratios.length} pass`}
        />
        <OverviewCell
          tone={haramPct < 1 ? 'tertiary' : haramPct < 5 ? 'caution' : 'error'}
          icon="volunteer_activism"
          label="Purification rate"
          value={`${haramPct.toFixed(2)}%`}
        />
        <OverviewCell
          tone="neutral"
          icon="event"
          label="Data as of"
          value={stock.dataSources.balanceSheetPeriod || '—'}
        />
      </div>

      {stock.description && (
        <AboutBlock name={stock.name} description={stock.description} />
      )}

      {!isPro && (
        <div className="sd-upsell">
          <MaterialIcon name="auto_awesome" className="text-primary" />
          <div>
            <strong>See the full math</strong>
            <span>Pro unlocks the exact debt, liquidity, receivable and haram-revenue ratios.</span>
          </div>
          <button type="button" className="btn btn-primary btn--sm" onClick={() => navigate('/upgrade')}>
            Upgrade
          </button>
        </div>
      )}

      <DisclaimerNotice />
    </div>
  )
}

// Renders a tiny "as of Xs ago" pill under the price. Re-ticks every 15s
// so the time stays accurate while the user reads the page.
function QuoteFreshness({ fetchedAt }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 15_000)
    return () => clearInterval(id)
  }, [])
  const seconds = Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000))
  const label =
    seconds < 5 ? 'just now'
    : seconds < 60 ? `${seconds}s ago`
    : seconds < 3600 ? `${Math.floor(seconds / 60)}m ago`
    : `${Math.floor(seconds / 3600)}h ago`
  return (
    <div
      className="sd-hero__freshness"
      title="Yahoo Finance quote — refreshes when you reload this page."
    >
      Quote {label}
    </div>
  )
}

function AboutBlock({ name, description }) {
  const [expanded, setExpanded] = useState(false)
  // Yahoo descriptions are commonly 1000+ chars. Collapsed view caps at
  // 4 lines mobile / 6 desktop via CSS line-clamp; the toggle reveals
  // the rest. Threshold dropped to 140 chars so the button doesn't show
  // for already-short descriptions where there's nothing to expand.
  const LONG_THRESHOLD = 140
  const isLong = description && description.length > LONG_THRESHOLD
  const showClamp = isLong && !expanded
  return (
    <div className="sd-about">
      <h4>About {name}</h4>
      <p className={showClamp ? 'sd-about__text sd-about__text--clamp' : 'sd-about__text'}>
        {description}
      </p>
      {isLong && (
        <button
          type="button"
          className="sd-about__toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
          <MaterialIcon
            name={expanded ? 'expand_less' : 'expand_more'}
            size={16}
            aria-hidden
          />
        </button>
      )}
    </div>
  )
}

function OverviewCell({ tone, icon, label, value }) {
  // Mobile: icon + label sit on one row at the top so the label never
  // wraps around an absolutely-positioned icon. Desktop CSS promotes the
  // icon back to the top-right corner via `display: contents`.
  return (
    <div className={`sd-cell sd-cell--${tone}`}>
      <div className="sd-cell__head">
        <div className="sd-cell__icon">
          <MaterialIcon name={icon} fill size={16} />
        </div>
        <span className="sd-cell__label">{label}</span>
      </div>
      <span className="sd-cell__value">{value}</span>
    </div>
  )
}

function Ratios({ stock, isPro, navigate }) {
  if (!isPro) return <PremiumGate navigate={navigate} body={`See exactly why ${stock.ticker} passed or failed each ratio under ${stock.methodology}. Pro unlocks the full breakdown.`} />
  return (
    <div className="sd-card">
      <h3 className="sd-card__title">Financial ratios · {stock.methodology}</h3>
      <p className="sd-card__copy">
        We compute four ratios from the most recent annual report. Pass means the value is below
        the methodology's published threshold.
      </p>
      <div className="sd-ratios-grid">
        {stock.ratios.map(r => (
          <RatioBar key={r.name} {...r} />
        ))}
      </div>
    </div>
  )
}

function Business({ stock, isPro, navigate }) {
  if (!isPro) return <PremiumGate navigate={navigate} body="See the business-activity classifier and why this stock is in (or out of) the permissible universe." />
  const tone = stock.business.status === 'PASS' ? 'tertiary'
    : stock.business.status === 'FAIL' ? 'error' : 'caution'
  return (
    <div className="sd-card">
      <h3 className="sd-card__title">Business activity</h3>
      <div className={`sd-bus sd-bus--${tone}`}>
        <div className="sd-bus__icon">
          <MaterialIcon name={stock.business.status === 'PASS' ? 'verified' : stock.business.status === 'FAIL' ? 'block' : 'help'} fill size={20} />
        </div>
        <div>
          <strong>
            {stock.business.status === 'PASS' && 'Core business is permissible'}
            {stock.business.status === 'FAIL' && 'Core business is non-permissible'}
            {stock.business.status === 'CAUTION' && 'Mixed business — review revenue mix'}
            {stock.business.status === 'DOUBTFUL' && 'Business activity unclear'}
          </strong>
          <p>{stock.business.reason}</p>
        </div>
      </div>
      <p className="sd-card__copy">{stock.business.detail}</p>
    </div>
  )
}

function Purification({ stock, isPro, navigate }) {
  if (!isPro) return <PremiumGate navigate={navigate} body="Compute the exact dividend purification % owed under your methodology." />
  const pct = (stock.haramRevenuePercent || 0) * 100
  const symbol = getCurrencySymbol(stock.currency || 'USD')
  return (
    <div className="sd-card">
      <h3 className="sd-card__title">Dividend purification</h3>
      <div className="sd-pur">
        <span className="sd-pur__label">Purification rate</span>
        <span className="sd-pur__value">{pct.toFixed(2)}%</span>
      </div>
      <p className="sd-card__copy">
        Donate this percentage of any dividend received from {stock.ticker} to charity to purify
        the impermissible portion of revenue. Capital gains are not purified under the dominant
        AAOIFI position.
      </p>
      <div className="sd-pur-example">
        <span>Worked example: a {symbol}1,000 dividend → donate</span>
        <strong>{symbol}{(pct * 10).toFixed(2)}</strong>
      </div>
    </div>
  )
}
