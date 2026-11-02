import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { apiUrl } from '../lib/apiBase'
import { fetchAllScreeningData } from '../services/yahooFinanceApi'
import { screenStock } from '../services/complianceEngine'
import { screenJob, readPostingText, looksLikeUrl, pickEmployerListing, GENERAL_PRINCIPLE } from '../services/jobEngine'
import { normalizeCompanyName } from '../services/ethics'
import EthicsPanel, { useEthics, ethicsHeadline } from '../components/EthicsPanel'
import ScreenerSwitch from '../components/ScreenerSwitch'
import MaterialIcon from '../components/MaterialIcon'
import DisclaimerNotice from '../components/DisclaimerNotice'
import useDocumentTitle from '../hooks/useDocumentTitle'
import './Jobs.css'

const VERDICT_ICON = { compliant: 'check_circle', review: 'rule', non: 'cancel' }

const STOCK_STATUS = {
  COMPLIANT: 'Compliant',
  NON_COMPLIANT: 'Non-compliant',
  REVIEW_REQUIRED: 'Needs review',
  UNVERIFIED: 'Unverified',
  DOUBTFUL: 'Unverified',
}

const APPLIES_TO = { role: 'This role', employer: 'The employer', mention: 'Mentioned in the posting' }

async function readPostingLink(url) {
  const res = await fetch(apiUrl(`/api/job-posting?url=${encodeURIComponent(url)}`))
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(body.error || 'We couldn’t read that posting.'), { code: body.code })
  return body
}

async function searchCompany(name) {
  const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(name.slice(0, 50))}`))
  if (!res.ok) return []
  const data = await res.json().catch(() => [])
  return Array.isArray(data) ? data : []
}

export default function Jobs() {
  useDocumentTitle('Job screener')
  const [params, setParams] = useSearchParams()
  const [input, setInput] = useState(params.get('url') || '')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const [posting, setPosting] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [listings, setListings] = useState([])
  const [ticker, setTicker] = useState('')
  const [employer, setEmployer] = useState({ loading: false, data: null, error: null })
  const reportRef = useRef(null)
  // Only the latest read and lookup may update the page; an older one that
  // answers late is dropped.
  const runId = useRef(0)
  const lookupId = useRef(0)

  const lookUpCompany = useCallback(async name => {
    const id = ++lookupId.current
    setListings([])
    setTicker('')
    if (!name.trim()) return
    let results = []
    try {
      results = await searchCompany(name)
    } catch {
      results = []
    }
    if (id !== lookupId.current) return
    setListings(results.filter(r => r.type !== 'ETF'))
    const match = pickEmployerListing(name, results, normalizeCompanyName)
    setTicker(match?.symbol || '')
  }, [])

  const run = useCallback(async raw => {
    const value = raw.trim()
    if (!value) return
    const id = ++runId.current
    setError(null)
    setPhase('reading')
    try {
      let next
      if (looksLikeUrl(value)) {
        next = await readPostingLink(value)
        if (id !== runId.current) return
        if (!next.company) next.company = readPostingText(next.text).company
        setParams({ url: value }, { replace: true })
      } else {
        next = { ...readPostingText(value), url: '', source: 'pasted', industry: '' }
        if (params.get('url')) setParams({}, { replace: true })
      }
      setPosting(next)
      setCompanyName(next.company || '')
      setPhase('ready')
      lookUpCompany(next.company || '')
      requestAnimationFrame(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (err) {
      if (id !== runId.current) return
      setPhase('error')
      setError({ message: err.message, code: err.code })
    }
  }, [lookUpCompany, params, setParams])

  // A shared link (?url=…) screens straight away.
  useEffect(() => {
    const url = params.get('url')
    if (url && phase === 'idle') run(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Screen the employer's listing, when it has one.
  useEffect(() => {
    if (!ticker) {
      setEmployer({ loading: false, data: null, error: null })
      return undefined
    }
    const controller = new AbortController()
    setEmployer({ loading: true, data: null, error: null })
    fetchAllScreeningData(ticker, { signal: controller.signal })
      .then(data => {
        const compliance = screenStock(data.profile, data.balanceSheet, data.income)
        setEmployer({
          loading: false,
          error: null,
          data: {
            ticker,
            name: data.profile.name || ticker,
            industry: data.profile.industry,
            sector: data.profile.sector,
            country: data.profile.country,
            employees: data.profile.employees,
            website: data.profile.website,
            description: data.profile.description,
            business: compliance.businessScreen,
            status: compliance.status,
            methodology: compliance.methodology,
          },
        })
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setEmployer({
          loading: false,
          data: null,
          error: err.status === 429
            ? 'You’ve reached today’s free screens, so we couldn’t load the company’s profile. The role is still screened from the posting.'
            : 'We couldn’t load the company’s profile. The role is still screened from the posting.',
        })
      })
    return () => controller.abort()
  }, [ticker])

  const job = useMemo(() => {
    if (!posting) return null
    return screenJob({
      title: posting.title,
      text: posting.text,
      industry: employer.data?.industry || posting.industry || '',
      businessStatus: employer.data?.business?.status || null,
    })
  }, [posting, employer.data])

  const employerName = employer.data?.name || companyName
  const ethics = useEthics({ name: employerName, ticker, aliases: companyName && companyName !== employerName ? [companyName] : [] })

  return (
    <div className="jobs-page container animate-entrance">
      <section className="jobs-hero">
        <ScreenerSwitch />
        <h1 className="text-h1">Is this job halal?</h1>
        <p>
          Paste a link to a job posting, or the description itself. We read the role and the employer, check them
          against the rulings scholars apply to work, and look the company up on boycott lists.
        </p>
        <form
          className="jobs-form"
          onSubmit={e => {
            e.preventDefault()
            run(input)
          }}
        >
          <label htmlFor="job-input" className="sr-only">Job link or description</label>
          <textarea
            id="job-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={4}
            placeholder="https://… or paste the job description"
            spellCheck={false}
          />
          <div className="jobs-form__foot">
            <span>Greenhouse, Lever, Workday and most careers pages work. For LinkedIn or Indeed, paste the text.</span>
            <button type="submit" className="btn jobs-form__submit" disabled={!input.trim() || phase === 'reading'}>
              {phase === 'reading' ? 'Reading…' : 'Screen this job'}
            </button>
          </div>
        </form>
      </section>

      {phase === 'error' && error && (
        <div className="jobs-error" role="alert">
          <MaterialIcon name="error_outline" size={20} />
          <div>
            <strong>{error.message}</strong>
            {['BLOCKED', 'EMPTY', 'NOT_A_PAGE', 'NOT_FOUND', 'UNREACHABLE'].includes(error.code) && (
              <p>Open the posting, copy the whole description, and paste it in the box above instead.</p>
            )}
          </div>
        </div>
      )}

      {phase === 'ready' && posting && job && (
        <div className="jobs-report" ref={reportRef}>
          <header className="jobs-head">
            <h2>{posting.title || 'Untitled role'}</h2>
            <p>
              {[employerName, posting.location].filter(Boolean).join(', ') || 'Employer not found in the posting'}
              {posting.url && (
                <>
                  {' · '}
                  <a href={posting.url} target="_blank" rel="noopener noreferrer">Open posting</a>
                </>
              )}
            </p>
          </header>

          <EmployerPicker
            companyName={companyName}
            setCompanyName={setCompanyName}
            onLookUp={() => lookUpCompany(companyName)}
            listings={listings}
            ticker={ticker}
            setTicker={setTicker}
          />

          <div className={`jobs-verdict jobs-verdict--${job.tone}`}>
            <MaterialIcon name={VERDICT_ICON[job.tone]} fill size={30} />
            <div>
              <span className="jobs-verdict__label">Working here</span>
              <span className="jobs-verdict__value">{job.label}</span>
              <span className="jobs-verdict__reason">{job.reason}</span>
            </div>
          </div>

          <div className="jobs-indicators">
            <Indicator
              label="The role"
              value={job.role.length ? (job.verdict === 'NOT_PERMISSIBLE' ? 'Prohibited' : 'Scholars differ') : 'Permissible'}
              tone={job.role.length ? (job.verdict === 'NOT_PERMISSIBLE' ? 'error' : 'caution') : 'ok'}
            />
            <Indicator
              label="Employer’s business"
              value={
                employer.loading ? 'Checking'
                  : job.employerCore.length ? 'Prohibited'
                    : employer.data?.business?.status === 'CAUTION' || job.employerMentions.length ? 'Mostly permissible'
                      : employer.data || posting.text.length > 400 ? 'Permissible' : 'Not identified'
              }
              tone={job.employerCore.length ? 'error' : employer.data?.business?.status === 'CAUTION' || job.employerMentions.length ? 'caution' : 'ok'}
            />
            <Indicator
              label="Boycott lists"
              value={ethicsHeadline(ethics?.summary)}
              tone={ethics?.summary?.listed ? 'caution' : 'ok'}
            />
          </div>

          <section className="jobs-card">
            <h3>Rulings that apply</h3>
            {job.rulings.length === 0 ? (
              <div className="jobs-ruling">
                <p>{GENERAL_PRINCIPLE.summary}</p>
                <Evidence refs={GENERAL_PRINCIPLE.evidence} />
              </div>
            ) : (
              job.rulings.map(r => (
                <article key={r.id} className="jobs-ruling">
                  <div className="jobs-ruling__head">
                    <strong>{r.label}</strong>
                    <span className={`jobs-chip jobs-chip--${r.appliesTo}`}>{APPLIES_TO[r.appliesTo]}</span>
                  </div>
                  <p>{r.summary}</p>
                  {r.appliesTo !== 'role' && <p>{r.employer}</p>}
                  <Evidence refs={r.evidence} />
                </article>
              ))
            )}
            {job.islamicFinance && (
              <p className="jobs-card__note">
                The posting describes Islamic finance or halal products, so banking and insurance terms weren’t
                counted against it. Check that the products are certified by a Shariah board.
              </p>
            )}
          </section>

          <section className="jobs-card">
            <h3>The employer</h3>
            <EmployerProfile employer={employer} companyName={companyName} posting={posting} />
          </section>

          <section className="jobs-card">
            <h3>Ethics and boycotts</h3>
            {employerName ? (
              <EthicsPanel name={employerName} ticker={ticker} country={employer.data?.country} ethics={ethics} />
            ) : (
              <p className="jobs-card__copy">Add the employer’s name above to check it against the boycott lists.</p>
            )}
          </section>

          {job.benefits.length > 0 && (
            <section className="jobs-card">
              <h3>Pay and benefits</h3>
              {job.benefits.map(b => (
                <div key={b.id} className="jobs-benefit">
                  <strong>{b.title}</strong>
                  <p>{b.body}</p>
                </div>
              ))}
            </section>
          )}

          <p className="jobs-guidance">
            This is guidance to take to a scholar you trust, not a fatwa. Bring the full job description, since what
            you would actually do day to day decides the ruling.
          </p>
          <DisclaimerNotice compact />
        </div>
      )}
    </div>
  )
}

function Indicator({ label, value, tone }) {
  return (
    <div className={`jobs-indicator jobs-indicator--${tone}`}>
      <span className="jobs-indicator__label">{label}</span>
      <span className="jobs-indicator__value">{value}</span>
    </div>
  )
}

function Evidence({ refs }) {
  return (
    <p className="jobs-evidence">
      <span>Evidence:</span> {refs.join(' · ')}
    </p>
  )
}

function EmployerPicker({ companyName, setCompanyName, onLookUp, listings, ticker, setTicker }) {
  return (
    <form
      className="jobs-employer"
      onSubmit={e => {
        e.preventDefault()
        onLookUp()
      }}
    >
      <label className="jobs-employer__field">
        <span>Employer</span>
        <input
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          placeholder="Company name"
          autoComplete="organization"
        />
      </label>
      <button type="submit" className="btn btn-secondary">Look up</button>
      <label className="jobs-employer__field jobs-employer__field--listing">
        <span>Stock listing</span>
        <select value={ticker} onChange={e => setTicker(e.target.value)}>
          <option value="">Not a listed company</option>
          {listings.map(l => (
            <option key={l.symbol} value={l.symbol}>
              {l.name} ({l.symbol}{l.exchange ? `, ${l.exchange}` : ''})
            </option>
          ))}
        </select>
      </label>
    </form>
  )
}

function EmployerProfile({ employer, companyName, posting }) {
  const [open, setOpen] = useState(false)
  if (employer.loading) return <div className="jobs-skel" aria-busy="true" />
  if (employer.error) return <p className="jobs-card__copy">{employer.error}</p>
  const d = employer.data
  if (!d) {
    return (
      <p className="jobs-card__copy">
        {companyName
          ? `${companyName} isn’t matched to a stock listing, so this report reads the employer from the posting. If it is listed, pick it above.`
          : 'We couldn’t find the employer’s name in the posting. Add it above.'}
        {posting.industry ? ` The posting gives its industry as ${posting.industry}.` : ''}
      </p>
    )
  }
  const description = d.description || ''
  const short = description.length > 420 && !open ? `${description.slice(0, 420).replace(/\s+\S*$/, '')}…` : description
  return (
    <div className="jobs-employer-profile">
      <dl className="jobs-facts">
        <div><dt>Industry</dt><dd>{d.industry || d.sector || 'Not given'}</dd></div>
        <div><dt>Headquarters</dt><dd>{d.country || 'Not given'}</dd></div>
        {Number.isFinite(d.employees) && d.employees > 0 && (
          <div><dt>Employees</dt><dd>{d.employees.toLocaleString()}</dd></div>
        )}
        {d.website && (
          <div><dt>Website</dt><dd><a href={d.website} target="_blank" rel="noopener noreferrer">{d.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></dd></div>
        )}
      </dl>
      {description && (
        <p className="jobs-card__copy">
          {short}{' '}
          {description.length > 420 && (
            <button type="button" className="jobs-link" onClick={() => setOpen(o => !o)}>
              {open ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>
      )}
      <p className="jobs-card__copy">
        <strong>{d.business.reason}.</strong> As an investment, {d.ticker} is{' '}
        <strong>{(STOCK_STATUS[d.status] || 'unscreened').toLowerCase()}</strong> under {d.methodology}. That screen also
        tests debt and interest income, which matter for owning the shares, not for working there.{' '}
        <Link to={`/stock/${encodeURIComponent(d.ticker)}`}>Open the stock report</Link>
      </p>
    </div>
  )
}
