/**
 * Job screener: reads a job posting and says whether the work is
 * permissible, and why.
 *
 * Two questions decide it, the way scholars frame employment:
 *   1. Is the role itself part of something prohibited? (a loan officer
 *      writes riba contracts; a bartender serves alcohol)
 *   2. Is the employer's core business prohibited? A permissible role at a
 *      company whose core business is prohibited is where scholars differ.
 *
 * The employer's financial ratios matter for owning its shares, not for
 * working there, so they don't enter the job verdict.
 *
 * Everything here is plain keyword matching, so it can explain each finding
 * and runs the same in the browser and in tests.
 */

// ── Rulings ─────────────────────────────────────────────────────────────

/**
 * `severity`: 'prohibited' when the role is direct participation in it;
 * 'differ' where scholars hold different views even for direct roles.
 */
export const RULINGS = {
  riba: {
    label: 'Interest (riba)',
    severity: 'prohibited',
    summary:
      'Lending or borrowing at interest is prohibited. The prohibition reaches beyond the lender: the Prophet ﷺ cursed the one who takes riba, the one who pays it, the one who writes the contract and its witnesses.',
    evidence: ['Quran 2:275–279', 'Sahih Muslim 1598'],
    employer:
      'Scholars differ on roles with no part in interest at a conventional bank or lender. The Permanent Committee in Saudi Arabia, among others, holds that any job there supports its core business and should be avoided. Others allow roles such as IT, cleaning or security where there is need, while urging the worker to move on when they can.',
  },
  alcohol: {
    label: 'Alcohol',
    severity: 'prohibited',
    summary:
      'Intoxicants are prohibited, and so is helping them reach people: the Prophet ﷺ cursed the one who presses wine, carries it, serves it, sells it and buys it, as well as the one who drinks it.',
    evidence: ['Quran 5:90–91', 'Sunan Abi Dawud 3674'],
    employer:
      'Working in a permissible role at a brewer, distiller or bar group is where scholars differ. Many advise against it because the company exists to sell alcohol; others allow roles with no hand in producing, selling or serving it.',
  },
  gambling: {
    label: 'Gambling',
    severity: 'prohibited',
    summary: 'Gambling (maysir) is prohibited alongside intoxicants, and running or promoting it shares in the sin.',
    evidence: ['Quran 5:90–91', 'Quran 2:219'],
    employer:
      'Scholars differ on permissible roles at a betting or casino company. Many advise against it, since the company’s income is gambling revenue.',
  },
  pork: {
    label: 'Pork',
    severity: 'prohibited',
    summary: 'Pork is prohibited to eat, and the Prophet ﷺ prohibited trading in it.',
    evidence: ['Quran 2:173', 'Sahih al-Bukhari 2236'],
    employer: 'Scholars differ on roles away from the pork itself at a company built on pork products; most advise avoiding it.',
  },
  adult: {
    label: 'Adult content',
    severity: 'prohibited',
    summary: 'Producing or promoting indecency is prohibited, as is spreading it among people.',
    evidence: ['Quran 17:32', 'Quran 24:19'],
    employer: 'A company whose business is adult content is not a permissible employer for any role.',
  },
  tobacco: {
    label: 'Tobacco and recreational drugs',
    severity: 'prohibited',
    summary:
      'Most contemporary scholars hold that smoking and recreational drugs are prohibited because of the harm they cause, which makes selling and promoting them prohibited too. Some older opinions held tobacco to be disliked rather than prohibited.',
    evidence: ['Quran 2:195', 'Sunan Ibn Majah 2340'],
    employer: 'Scholars differ on roles at a tobacco or cannabis company that have no part in the product itself.',
  },
  insurance: {
    label: 'Conventional insurance',
    severity: 'differ',
    summary:
      'The International Islamic Fiqh Academy ruled commercial insurance impermissible because of uncertainty (gharar) and interest, and approved cooperative insurance (takaful) instead. Some scholars allow it where it is required by law or there is no takaful option.',
    evidence: ['IIFA Resolution 9 (2/9), 1985', 'AAOIFI Shariah Standard 26'],
    employer:
      'Scholars differ on working for a conventional insurer, especially in roles away from underwriting and claims.',
  },
  fortune: {
    label: 'Fortune-telling',
    severity: 'prohibited',
    summary: 'Claiming knowledge of the unseen through astrology, tarot or psychic readings is prohibited, and so is earning from it.',
    evidence: ['Quran 27:65', 'Sahih Muslim 2230'],
    employer: 'A company built on fortune-telling is not a permissible employer.',
  },
}

export const GENERAL_PRINCIPLE = {
  summary:
    'Earning a living is encouraged, and the work itself must be lawful. A Muslim should not help others in what is prohibited, even in a supporting role.',
  evidence: ['Quran 5:2', 'Sahih al-Bukhari 2072'],
}

// ── Keywords ────────────────────────────────────────────────────────────

/**
 * Role patterns are matched against the job title, where they mean the job
 * is direct participation. Employer patterns are matched against the whole
 * posting, where they describe what the company does.
 */
const ROLE_PATTERNS = {
  riba: [
    /\bloan(s)? (officer|originator|processor|underwriter|advisor|adviser|specialist|closer|analyst)\b/,
    /\bmortgage\b/,
    /\b(credit|lending|loan) (underwriter|analyst|officer|manager|risk analyst)\b/,
    /\bdebt (collector|collection|recovery)\b/,
    /\bcollections? (agent|officer|specialist|advisor)\b/,
    /\bpayday\b/,
    /\b(debt|leveraged) (capital markets|finance)\b/,
    /\b(fixed income|interest rates?|rates) (trader|trading|sales|structurer)\b/,
    /\bcredit cards?\b/,
  ],
  alcohol: [
    /\bbar ?(tender|man|maid|back|staff|supervisor|manager|team|lead|server|associate)\b/,
    /\bmixologist\b/,
    /\bsommelier\b/,
    /\bbrew(er|master|ery|ing)\b/,
    /\bdistill(er|ery)\b/,
    /\bwine ?(maker|making|steward|advisor|consultant|sales|rep)\b/,
    /\b(beer|spirits|wine|liquor|alcohol) (sales|brand|rep|representative|merchandiser|buyer)\b/,
    /\bcellar ?(man|hand|person|master)\b/,
    /\bpub\b/,
  ],
  gambling: [
    /\bcasino\b/,
    /\bcroupier\b/,
    /\b(table games|blackjack|poker|roulette) dealer\b/,
    /\bsports ?book\b/,
    /\bbetting\b/,
    /\bbookmaker\b/,
    /\bodds ?compiler\b/,
    /\b(i)?gaming floor\b/,
    /\bslots?\b.*\b(technician|attendant|host)\b/,
    /\blottery\b/,
    /\bbingo\b/,
  ],
  pork: [/\bpork\b/, /\b(pig|swine|hog) (farm|farmer|unit|stockperson|stockman)\b/],
  adult: [/\badult (content|entertainment|industry)\b/, /\b(stripper|exotic dancer|escort)\b/],
  tobacco: [/\btobacco(nist)?\b/, /\bcigar(ette)?s?\b/, /\bvap(e|ing)\b/, /\bcannabis\b/, /\bbudtender\b/, /\bdispensary\b/],
  insurance: [
    /\binsurance (underwriter|broker|agent|sales|advisor|adviser|claims)\b/,
    /\b(underwriter|underwriting)\b/,
    /\bclaims (handler|adjuster|assessor|examiner)\b/,
    /\bactuar(y|ial)\b/,
  ],
  fortune: [/\b(psychic|tarot|astrolog(er|y)|clairvoyant|medium reader)\b/],
}

const EMPLOYER_PATTERNS = {
  riba: [/\bbank(s|ing)?\b/, /\blend(er|ers|ing)\b/, /\bloans?\b/, /\bmortgages?\b/, /\bcredit cards?\b/, /\binterest rates?\b/, /\bconsumer credit\b/],
  alcohol: [/\bbrew(ery|eries|er|ers|ing)\b/, /\bdistill(ery|eries|er|ers)\b/, /\bbeers?\b/, /\bwines?\b/, /\bspirits\b/, /\bpubs?\b/, /\bcocktails?\b/, /\balcohol(ic)?\b/],
  gambling: [/\bcasinos?\b/, /\bbetting\b/, /\bgambling\b/, /\bsports ?book\b/, /\bigaming\b/, /\bbingo\b/, /\blotter(y|ies)\b/, /\bwager(s|ing)?\b/],
  pork: [/\bpork\b/, /\bbacon\b/, /\bham\b/, /\bpig(s)?\b/, /\bswine\b/],
  adult: [/\badult (content|entertainment)\b/, /\bpornograph(y|ic)\b/],
  tobacco: [/\btobacco\b/, /\bcigarettes?\b/, /\bvap(e|es|ing)\b/, /\bnicotine\b/, /\bcannabis\b/],
  insurance: [/\binsur(ance|er|ers)\b/, /\breinsurance\b/, /\bunderwrit(ing|er)\b/],
  fortune: [/\b(psychic|tarot|astrology|horoscopes?)\b/],
}

// Mentions this many times (or more) read as what the company does, rather
// than an aside.
const EMPLOYER_MIN_HITS = 3

// Text that marks Islamic finance or halal work, which the keywords above
// would otherwise read as their conventional twins.
const ISLAMIC_FINANCE = /\b(islamic (bank|banking|finance|window)|shariah?[- ]compliant|sharia|takaful|sukuk|murabaha|ijara|mudaraba|musharaka|halal)\b/

// Yahoo industries, as `screenBusinessActivity` reads them, mapped to the
// ruling they fall under.
const INDUSTRY_RULINGS = [
  [/\b(banks?|mortgage finance|credit services|consumer finance|capital markets|savings)\b/, 'riba'],
  [/\binsurance\b/, 'insurance'],
  [/\b(brewers|breweries|wineries|distilleries|distillers)\b/, 'alcohol'],
  [/\b(gambling|casinos)\b/, 'gambling'],
  [/\btobacco\b/, 'tobacco'],
  [/\badult\b/, 'adult'],
  [/\bpork\b/, 'pork'],
]

const lower = s => String(s || '').toLowerCase().replace(/[–—]/g, '-')

// Everyday phrases that contain an employer keyword without saying anything
// about the business: UK bank holidays, health insurance as a perk, a
// season-ticket loan.
const NOISE = [
  /\bbank holidays?\b/g,
  /\b(bank|banking) (account|details|transfer|statement)s?\b/g,
  /\b(food|blood|data|piggy|time|river|west|south|left|right) banks?\b/g,
  /\b(health|medical|dental|vision|life|travel|pet|income protection|private medical|national|group life|disability|critical illness|employer liability|professional indemnity) insurance\b/g,
  /\binsurance (benefits?|scheme|plan|policy|number)s?\b/g,
  /\b(season ticket|student|interest[- ]free|cycle to work|tech|laptop) loans?\b/g,
  /\b(high|team) spirits\b/g,
  /\bguinea pigs?\b/g,
  /\bwine and dine\b/g,
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

/** Rulings the job title itself falls under. */
export function screenRole(title) {
  const t = lower(title)
  if (!t || ISLAMIC_FINANCE.test(t)) return []
  return Object.entries(ROLE_PATTERNS)
    .filter(([, patterns]) => patterns.some(p => p.test(t)))
    .map(([id]) => id)
}

/**
 * What the posting says the employer does: rulings mentioned at least
 * EMPLOYER_MIN_HITS times are the core business, fewer are mentions.
 */
export function screenEmployerText(text) {
  const t = withoutNoise(lower(text))
  const islamic = ISLAMIC_FINANCE.test(t)
  const core = []
  const mentions = []
  for (const [id, patterns] of Object.entries(EMPLOYER_PATTERNS)) {
    if (islamic && (id === 'riba' || id === 'insurance')) continue
    const hits = countHits(t, patterns)
    if (hits >= EMPLOYER_MIN_HITS) core.push(id)
    else if (hits > 0) mentions.push(id)
  }
  return { core, mentions, islamicFinance: islamic }
}

/** The ruling a Yahoo industry falls under, if any. */
export function industryRuling(industry) {
  const i = lower(industry)
  if (!i) return null
  return INDUSTRY_RULINGS.find(([re]) => re.test(i))?.[1] ?? null
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
}

/**
 * @param {object} input
 * @param {string} input.title           Job title
 * @param {string} input.text            Whole posting text
 * @param {string} [input.industry]      Employer's industry, when it is listed
 * @param {string} [input.businessStatus] screenBusinessActivity status for the employer
 */
export function screenJob({ title = '', text = '', industry = '', businessStatus = null }) {
  const role = screenRole(title)
  const fromText = screenEmployerText(`${title}\n${text}`)
  const fromIndustry = industryRuling(industry)

  // A listed employer's industry outranks what the posting text suggests:
  // once it is known, the text's findings are only mentions.
  const employerCore = fromIndustry ? [fromIndustry] : industry ? [] : fromText.core
  const employerMentions = [...(industry ? fromText.core : []), ...fromText.mentions]
    .filter(id => !employerCore.includes(id) && !role.includes(id))

  const prohibitedRole = role.filter(id => RULINGS[id].severity === 'prohibited')
  const differRole = role.filter(id => RULINGS[id].severity === 'differ')

  let verdict
  let reason
  if (prohibitedRole.length) {
    verdict = 'NOT_PERMISSIBLE'
    reason = `The role itself involves ${joinLabels(prohibitedRole)}.`
  } else if (differRole.length) {
    verdict = 'DIFFER'
    reason = `The role itself involves ${joinLabels(differRole)}, where scholars differ.`
  } else if (employerCore.some(id => id === 'adult' || id === 'fortune')) {
    verdict = 'NOT_PERMISSIBLE'
    reason = `The employer’s business is ${joinLabels(employerCore)}.`
  } else if (employerCore.length) {
    verdict = 'DIFFER'
    reason = `The role isn’t prohibited in itself, but the employer’s core business is ${joinLabels(employerCore)}.`
  } else if (businessStatus === 'CAUTION' || employerMentions.length) {
    verdict = 'CAUTION'
    reason = businessStatus === 'CAUTION'
      ? 'The role is permissible. The employer’s business is mostly permissible, with some income from prohibited sources.'
      : `The role is permissible. The posting mentions ${joinLabels(employerMentions)}; check whether that is part of the business or only a mention.`
  } else {
    verdict = 'PERMISSIBLE'
    reason = 'Nothing in the role or the employer’s business is prohibited.'
  }

  const rulingIds = [...new Set([...role, ...employerCore, ...employerMentions])]
  return {
    verdict,
    ...JOB_VERDICTS[verdict],
    reason,
    role,
    employerCore,
    employerMentions,
    islamicFinance: fromText.islamicFinance,
    rulings: rulingIds.map(id => ({
      id,
      ...RULINGS[id],
      appliesTo: role.includes(id) ? 'role' : employerCore.includes(id) ? 'employer' : 'mention',
    })),
    benefits: screenBenefits(text),
  }
}

function joinLabels(ids) {
  const labels = ids.map(id => RULINGS[id].label.toLowerCase())
  if (labels.length <= 1) return labels[0] || ''
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`
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
  return /^https?:\/\/\S+$/i.test(s) || /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/i.test(s)
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
