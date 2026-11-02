/**
 * Job screener: reads a job posting and says whether the work is
 * permissible, and why.
 *
 * Two questions decide it, the way scholars frame employment:
 *   1. Is the role itself part of something prohibited? (a loan officer
 *      writes riba contracts; a bartender serves alcohol)
 *   2. Is the employer's core business prohibited? A permissible role at a
 *      company whose core business is prohibited is where scholars differ,
 *      except for businesses no role can serve (adult content, indiscriminate
 *      weapons, fortune-telling).
 *
 * The employer's financial ratios matter for owning its shares, not for
 * working there, so they don't enter the job verdict.
 *
 * The activities and their rulings live in activities.js, shared with the
 * stock screen. Everything here is plain keyword matching, so it can explain
 * each finding and runs the same in the browser and in tests.
 */

import { ACTIVITIES, ACTIVITY_IDS, INDUSTRY_ACTIVITIES, describedActivities, activityLabels } from './activities.js'

export const RULINGS = ACTIVITIES

export const GENERAL_PRINCIPLE = {
  summary:
    'Earning a living is encouraged, and the work itself must be lawful. A Muslim should not help others in what is prohibited, even in a supporting role.',
  evidence: ['Quran 5:2', 'Sahih al-Bukhari 2072'],
}

// ── Keywords ────────────────────────────────────────────────────────────

// Mentions this many times (or more) read as what the company does, rather
// than an aside.
const EMPLOYER_MIN_HITS = 3

// Text that marks Islamic finance or halal work, which the keywords would
// otherwise read as their conventional twins.
const ISLAMIC_FINANCE = /\b(islamic (bank|banking|finance|window)|shariah?[- ]compliant|sharia|takaful|sukuk|murabaha|ijara|mudaraba|musharaka|halal)\b/
const ISLAMIC_EXEMPT = new Set(['riba', 'insurance', 'speculation'])

const lower = s => String(s || '').toLowerCase().replace(/[–—]/g, '-')

// Everyday phrases that contain an employer keyword without saying anything
// about the business: UK bank holidays, health insurance as a perk, a
// season-ticket loan, concert tickets as a team treat.
const NOISE = [
  /\bbank holidays?\b/g,
  /\b(bank|banking) (account|details|transfer|statement)s?\b/g,
  /\b(food|blood|data|piggy|time|river|west|south|left|right) banks?\b/g,
  // Insurance offered as a perk, including lists ("medical, dental and
  // vision insurance", "life & accident insurance").
  /\b(health|medical|rx|dental|vision|life|accident|ancillary|supplemental|travel|pet|income protection|private medical|national|group|disability|critical illness|employer liability|professional indemnity|car|home|renters?)\b[^.\n]{0,24}\binsurance\b/g,
  /\binsurance (benefits?|scheme|plan|policy|number)s?\b/g,
  /\b(season ticket|student|interest[- ]free|cycle to work|tech|laptop) loans?\b/g,
  /\b(high|team) spirits\b/g,
  /\bguinea pigs?\b/g,
  /\bwine and dine\b/g,
  /\bconcert tickets?\b/g,
  /\bweapons? of choice\b/g,
  /\b(prisoner|security|police|vehicle|convoy|patient|medical|custody) escort(s|ing)?\b/g,
  /\b(glue|nail|heat|spray|staple|massage|caulk(ing)?) guns?\b/g,
  /\b(must be|aged?|over) 18\b/g,
  /\b(time|interview|delivery|booking|appointment) slots?\b/g,
  /\b(against (all )?the odds|at odds|odds are)\b/g,
  /\bweed (control|killer|removal)s?\b/g,
  /\b(juice|salad|snack|protein|chocolate|candy|granola|cereal|energy|nail|brow|lash|oxygen|coffee|espresso|sandwich|hot|tool|space|breakfast|sushi) bars?\b/g,
  /\b(kindred|team|community|free) spirits?\b/g,
  /\bpharmacy dispensary\b/g,
]

const withoutNoise = text => NOISE.reduce((t, re) => t.replace(re, ' '), text)

function countHits(text, patterns) {
  let hits = 0
  for (const p of patterns) {
    const re = new RegExp(p.source, 'g')
    hits += (text.match(re) || []).length
  }
  return hits
}

/** Activities the job title itself is part of. */
export function screenRole(title) {
  const t = withoutNoise(lower(title))
  if (!t || ISLAMIC_FINANCE.test(t)) return []
  const found = ACTIVITY_IDS.filter(id => ACTIVITIES[id].role?.some(p => p.test(t)))
  // An indiscriminate-weapons role is also a weapons role; name it once.
  return found.includes('indiscriminate') ? found.filter(id => id !== 'weapons') : found
}

/**
 * What the posting says the employer does: activities mentioned at least
 * EMPLOYER_MIN_HITS times are the core business, fewer are mentions.
 */
export function screenEmployerText(text) {
  const t = withoutNoise(lower(text))
  const islamic = ISLAMIC_FINANCE.test(t)
  const core = []
  const mentions = []
  // A company's own site is long and touches many topics in passing, so
  // there only the words it sells with decide its business.
  const strongCore = []
  for (const id of ACTIVITY_IDS) {
    if (islamic && ISLAMIC_EXEMPT.has(id)) continue
    const strong = countHits(t, ACTIVITIES[id].strong || [])
    const hits = countHits(t, ACTIVITIES[id].text || []) + 2 * strong
    // Indiscriminate weapons are core on a single mention.
    if (hits >= EMPLOYER_MIN_HITS || (id === 'indiscriminate' && hits > 0)) core.push(id)
    else if (hits > 0) mentions.push(id)
    if (strong >= 2 || (id === 'indiscriminate' && hits > 0)) strongCore.push(id)
  }
  return { core, mentions, strongCore, islamicFinance: islamic }
}

// Islamic banks and insurers whose names carry a conventional word.
const ISLAMIC_NAMES = /\b(islami[ck]?|al ?rajhi|al ?rayan|meezan|kuwait finance house|al ?baraka|alinma|al ?bilad|aljazira|boubyan|masraf|gatehouse|wahed|takaful|sukuk|shariah?|halal)\b/

/** The words in a link's address: careers.bet365.com → "careers bet365". */
export function hostWords(url) {
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
    const labels = host.split('.')
    return labels.slice(0, Math.max(1, labels.length - (labels.length > 2 && labels.at(-2).length <= 3 ? 2 : 1))).join(' ').replace(/-/g, ' ')
  } catch {
    return ''
  }
}

/** The address's words and the full host name, for name screening. */
export function hostTerms(url) {
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
    return `${hostWords(url)} ${host}`
  } catch {
    return ''
  }
}

/**
 * Activities the employer's name (or the site's address) gives away: a
 * brand like bet365 or Pornhub, or a name built on a word like "brewery".
 * Bare words are skipped for a listed company with a known industry.
 */
export function screenEmployerName({ name = '', host = '', industryKnown = false }) {
  const t = withoutNoise(lower(`${name} ${host}`))
  if (!t.trim()) return []
  const islamic = ISLAMIC_NAMES.test(t)
  return ACTIVITY_IDS.filter(id => {
    const n = ACTIVITIES[id].names
    if (!n) return false
    if (islamic && ISLAMIC_EXEMPT.has(id)) return false
    return n.brands?.test(t) || (!industryKnown && n.words?.test(t))
  })
}

// Words that show a page is a job posting rather than, say, a company's
// shop front.
const JOB_WORDS = /\b(responsibilit(y|ies)|requirements|qualifications|experience|apply|salary|benefits|candidates?|you will|we are looking for|about the role|the role|skills|full[- ]time|part[- ]time|hiring|vacanc(y|ies)|job description|per (hour|annum|year))\b/g

/** True when a read page (or pasted text) is a job posting. */
export function isJobPosting({ source = '', text = '' }) {
  if (['greenhouse', 'lever', 'schema'].includes(source)) return true
  return new Set(lower(text).match(JOB_WORDS) || []).size >= 3
}

/** The activity a Yahoo industry is, and whether it is the core business. */
export function industryActivity(industry) {
  const i = lower(industry)
  if (!i) return null
  const hit = INDUSTRY_ACTIVITIES.find(([re]) => re.test(i))
  return hit ? { id: hit[1], core: hit[2] } : null
}

/** The activity a Yahoo industry is the core business of, if any. */
export function industryRuling(industry) {
  const hit = industryActivity(industry)
  return hit?.core ? hit.id : null
}

/**
 * Pay and benefits worth a note: a workplace pension usually defaults to a
 * conventional fund; shares in the employer are an investment to screen.
 */
export function screenBenefits(text) {
  const t = lower(text)
  const notes = []
  if (/\b(pension|401\s?\(?k\)?|403\s?\(?b\)?|retirement plan|superannuation|kiwisaver|provident fund)\b/.test(t)) {
    notes.push({
      id: 'pension',
      title: 'Workplace pension',
      body: 'Pension schemes usually start you in a conventional fund that holds bonds and interest-bearing assets. Ask HR for the Shariah-compliant fund option; most large UK and US schemes have one.',
    })
  }
  if (/\b(stock options?|rsus?|restricted stock|equity (grant|package|award)|share (scheme|options?|plan)|espp)\b/.test(t)) {
    notes.push({
      id: 'equity',
      title: 'Shares in the company',
      body: 'Part of the pay is in the company’s shares. Owning them is an investment, so the stock screen below applies to it.',
    })
  }
  if (/\b(life insurance|life assurance|death in service)\b/.test(t)) {
    notes.push({
      id: 'insurance',
      title: 'Life insurance benefit',
      body: 'Employer life cover is conventional insurance. Scholars are more lenient where it comes automatically with the job and you pay nothing for it.',
    })
  }
  return notes
}

// ── Verdict ─────────────────────────────────────────────────────────────

export const JOB_VERDICTS = {
  PERMISSIBLE: { label: 'Permissible', tone: 'compliant' },
  CAUTION: { label: 'Permissible with care', tone: 'review' },
  DIFFER: { label: 'Scholars differ', tone: 'review' },
  NOT_PERMISSIBLE: { label: 'Not permissible', tone: 'non' },
  NO_INFORMATION: { label: 'No information', tone: 'none' },
}

/**
 * @param {object} input
 * @param {string} input.title            Job title
 * @param {string} input.text             Whole posting text
 * @param {string} [input.industry]       Employer's industry, when it is listed
 * @param {string} [input.businessStatus] screenBusinessActivity status for the employer
 * @param {string} [input.description]    Employer's business description, when it is listed
 * @param {boolean} [input.employerKnown] Whether there's anything to go on about the employer:
 *   a stock listing, or a posting or website that describes it. Without it,
 *   and with nothing found, there is no verdict rather than a clean one.
 */
export function screenJob({ title = '', text = '', industry = '', businessStatus = null, description = '', name = '', host = '', isJob = true, employerKnown = true }) {
  const role = isJob ? screenRole(title) : []
  const read = screenEmployerText(`${title}\n${text}`)
  const fromText = isJob
    ? read
    : { ...read, core: read.strongCore, mentions: [...read.core, ...read.mentions].filter(id => !read.strongCore.includes(id)) }
  const fromIndustry = industryActivity(industry)

  // A listed employer's industry outranks what the posting text suggests:
  // once it is known, the text's findings are only mentions. Indiscriminate
  // weapons stay core however they are found.
  // When the posting and the company's own description (or its industry)
  // agree on an activity, it's the core business: Lockheed Martin's
  // postings and description both centre on missiles.
  const described = describedActivities(description)
  const corroborated = fromText.core.filter(id => described.includes(id) || fromIndustry?.id === id)
  const employerCore = fromIndustry?.core
    ? [fromIndustry.id]
    : industry
      ? fromText.core.filter(id => id === 'indiscriminate' || corroborated.includes(id))
      : fromText.core
  if (described.includes('indiscriminate') && !employerCore.includes('indiscriminate')) employerCore.push('indiscriminate')
  // The employer's name or the site's address can say it outright.
  for (const id of screenEmployerName({ name, host: host || '', industryKnown: !!industry })) {
    if (!employerCore.includes(id)) employerCore.push(id)
  }
  const employerMentions = [
    ...(fromIndustry && !fromIndustry.core ? [fromIndustry.id] : []),
    ...(industry ? fromText.core : []),
    ...fromText.mentions,
    ...described,
  ].filter((id, i, all) => all.indexOf(id) === i && !employerCore.includes(id) && !role.includes(id))

  const prohibitedRole = role.filter(id => ACTIVITIES[id].severity === 'prohibited')
  const differRole = role.filter(id => ACTIVITIES[id].severity === 'differ')
  const hardCore = employerCore.filter(id => ACTIVITIES[id].hardEmployer)

  let verdict
  let reason
  if (prohibitedRole.length) {
    verdict = 'NOT_PERMISSIBLE'
    reason = `The role itself involves ${activityLabels(prohibitedRole)}.`
  } else if (hardCore.length) {
    verdict = 'NOT_PERMISSIBLE'
    reason = `The ${isJob ? 'employer’s ' : ''}business is ${activityLabels(hardCore)}, which no role can serve.`
  } else if (differRole.length) {
    verdict = 'DIFFER'
    reason = `The role itself involves ${activityLabels(differRole)}, where scholars differ.`
  } else if (employerCore.length) {
    verdict = 'DIFFER'
    const prohibited = employerCore.filter(id => ACTIVITIES[id].severity === 'prohibited')
    reason = isJob
      ? `The role isn’t prohibited in itself, but the employer’s core business is ${activityLabels(employerCore)}.`
      : prohibited.length
        ? `This business is ${activityLabels(employerCore)}. Any job directly in ${prohibited.length > 1 ? 'them' : 'it'} is not permissible; scholars differ on roles away from it.`
        : `This business is ${activityLabels(employerCore)}, where scholars differ.`
  } else if (businessStatus === 'CAUTION' || employerMentions.length) {
    verdict = 'CAUTION'
    reason = employerMentions.length
      ? `${isJob ? 'The role is permissible. ' : ''}The ${isJob ? 'employer' : 'business'} is involved in ${activityLabels(employerMentions)} in some way; check whether that is part of the business or only a mention.`
      : `${isJob ? 'The role is permissible. ' : ''}The business is mostly permissible, with some income from prohibited sources.`
  } else if (!employerKnown) {
    verdict = 'NO_INFORMATION'
    reason = isJob
      ? 'We couldn’t find information about this employer, so there’s no verdict. The job title itself isn’t prohibited.'
      : 'We couldn’t find information about this business, so there’s no verdict.'
  } else {
    verdict = 'PERMISSIBLE'
    reason = isJob
      ? 'Nothing in the role or the employer’s business is prohibited.'
      : 'Nothing we could find about this business is prohibited.'
  }

  const ids = [...new Set([...role, ...employerCore, ...employerMentions])]
  return {
    verdict,
    ...JOB_VERDICTS[verdict],
    reason,
    isJob,
    role,
    employerCore,
    employerMentions,
    islamicFinance: fromText.islamicFinance,
    rulings: ids.map(id => ({
      id,
      ...ACTIVITIES[id],
      appliesTo: role.includes(id) ? 'role' : employerCore.includes(id) ? 'employer' : 'mention',
    })),
    benefits: screenBenefits(text),
  }
}

// ── Reading pasted text ─────────────────────────────────────────────────

const LABELLED = {
  title: /^(?:job title|title|position|role|vacancy)\s*[:\-–]\s*(.{3,100})$/im,
  company: /^(?:company|employer|organi[sz]ation|hiring company|company name)\s*[:\-–]\s*(.{2,80})$/im,
  location: /^(?:location|based in|office)\s*[:\-–]\s*(.{2,80})$/im,
}

const NAME = "[A-Z][\\w&.'’-]*(?:\\s+(?:&\\s+)?[A-Z][\\w&.'’-]*){0,4}"
const COMPANY_CUES = [
  new RegExp(`\\bAbout (${NAME})\\s*(?:\\n|:)`, 'g'),
  new RegExp(`\\bAt (${NAME}),? we\\b`, 'g'),
  new RegExp(`\\bJoin (${NAME})\\b`, 'g'),
  new RegExp(`\\b(${NAME}) is (?:a|an|the) (?:leading|global|world|international|fast|award|uk|us|european|growing|top|premier|innovative|largest|major)`, 'g'),
  new RegExp(`\\bwork(?:ing)? (?:at|for) (${NAME})\\b`, 'g'),
]
const NOT_COMPANIES = new Set(['us', 'the role', 'the team', 'the company', 'this role', 'our team', 'you', 'we', 'about', 'the job', 'job', 'role', 'company', 'our company', 'the position', 'position'])

/**
 * Best guesses at the title, company and location in pasted posting text.
 * The page lets the user correct the company before screening it.
 */
export function readPostingText(raw) {
  const text = String(raw || '').replace(/\r/g, '').trim()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const title = text.match(LABELLED.title)?.[1]?.trim()
    || lines.find(l => l.length >= 3 && l.length <= 90 && !/[.!?]$/.test(l) && !/^(about|job description|description|overview)\b/i.test(l))
    || ''

  const counts = new Map()
  const labelled = text.match(LABELLED.company)?.[1]?.trim()
  if (labelled) counts.set(labelled, 100)
  for (const cue of COMPANY_CUES) {
    for (const m of text.matchAll(cue)) {
      const name = m[1].trim().replace(/[.,]$/, '')
      if (NOT_COMPANIES.has(name.toLowerCase()) || name.length < 2) continue
      counts.set(name, (counts.get(name) || 0) + 1)
    }
  }
  const companies = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)

  return {
    title: title.slice(0, 120),
    company: companies[0] || '',
    otherCompanies: companies.slice(1, 4),
    location: text.match(LABELLED.location)?.[1]?.trim() || '',
    text,
  }
}

/** True when the input is a single link rather than posting text. */
export function looksLikeUrl(input) {
  const s = String(input || '').trim()
  return /^https?:\/\/\S+$/i.test(s) || /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(s)
}

// ── Matching the employer to a listing ──────────────────────────────────

/**
 * Picks the search result that is this employer, or null when none is a
 * confident match (a private company, a charity, a public body). Names must
 * agree once legal suffixes are dropped, or one must start with the other
 * ("Monzo" and "Monzo Bank").
 */
export function pickEmployerListing(company, results, normalize) {
  const want = normalize(company)
  if (!want || !Array.isArray(results)) return null
  const equities = results.filter(r => r?.type !== 'ETF')
  const exact = equities.find(r => normalize(r.name) === want)
  if (exact) return exact
  return equities.find(r => {
    const have = normalize(r.name)
    return have && (have.startsWith(`${want} `) || want.startsWith(`${have} `))
  }) || null
}
