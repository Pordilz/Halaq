import { test } from 'node:test'
import assert from 'node:assert/strict'
import { screenJob, screenRole, screenEmployerText, screenBenefits, readPostingText, looksLikeUrl, industryRuling } from '../src/services/jobEngine.js'

const repeat = (s, n) => Array.from({ length: n }, () => s).join(' ')

test('a role that writes interest contracts is not permissible, wherever it is', () => {
  const job = screenJob({ title: 'Mortgage Adviser', text: 'Help customers choose a mortgage.' })
  assert.equal(job.verdict, 'NOT_PERMISSIBLE')
  assert.deepEqual(job.role, ['riba'])
  assert.equal(job.rulings[0].appliesTo, 'role')
})

test('serving alcohol and running bets are direct roles', () => {
  assert.deepEqual(screenRole('Bartender (part time)'), ['alcohol'])
  assert.deepEqual(screenRole('Senior Sommelier'), ['alcohol'])
  assert.deepEqual(screenRole('Croupier – Table Games'), ['gambling'])
  assert.deepEqual(screenRole('Sportsbook Trader'), ['gambling'])
})

test('ordinary titles are not caught by look-alike words', () => {
  for (const title of ['Barista', 'Publishing Assistant', 'Software Engineer', 'Hamper Packer', 'Head of Brand', 'Data Analyst']) {
    assert.deepEqual(screenRole(title), [], title)
  }
})

test('a neutral role at a conventional bank is where scholars differ', () => {
  const job = screenJob({ title: 'Software Engineer', text: 'Build services.', industry: 'Banks - Diversified', businessStatus: 'FAIL' })
  assert.equal(job.verdict, 'DIFFER')
  assert.deepEqual(job.employerCore, ['riba'])
  assert.equal(job.rulings[0].appliesTo, 'employer')
})

test('an unlisted employer is read from the posting when it keeps returning to a topic', () => {
  const text = `We are a brewery. ${repeat('Our beers are brewed in Kent.', 3)}`
  const job = screenJob({ title: 'Warehouse Operative', text })
  assert.equal(job.verdict, 'DIFFER')
  assert.deepEqual(job.employerCore, ['alcohol'])
})

test('perks and UK bank holidays are not read as the business', () => {
  const text = `Benefits: 25 days plus bank holidays, private medical insurance, life insurance, health insurance, season ticket loan, pension.`
  const employer = screenEmployerText(text)
  assert.deepEqual(employer.core, [])
  assert.deepEqual(employer.mentions, [])
  assert.equal(screenJob({ title: 'Product Designer', text }).verdict, 'PERMISSIBLE')
})

test('Islamic finance is not read as conventional banking', () => {
  const text = `${repeat('Our Islamic banking products include home finance and savings at the bank.', 3)} Shariah-compliant.`
  assert.deepEqual(screenEmployerText(text).core, [])
  assert.deepEqual(screenRole('Islamic Banking Relationship Manager'), [])
})

test('a listed employer’s industry outranks the posting text', () => {
  const job = screenJob({ title: 'Engineer', text: repeat('loans', 4), industry: 'Software - Application', businessStatus: 'PASS' })
  assert.deepEqual(job.employerCore, [])
  assert.deepEqual(job.employerMentions, ['riba'])
  assert.equal(job.verdict, 'CAUTION')
})

test('a mixed listed business is permissible with care', () => {
  const job = screenJob({ title: 'Store Associate', text: 'Help customers in store.', industry: 'Discount Stores', businessStatus: 'CAUTION' })
  assert.equal(job.verdict, 'CAUTION')
})

test('insurance roles are where scholars differ, not a hard no', () => {
  const job = screenJob({ title: 'Claims Handler', text: 'Handle claims.' })
  assert.equal(job.verdict, 'DIFFER')
  assert.equal(industryRuling('Insurance - Life'), 'insurance')
})

test('pensions, shares and life cover get a note', () => {
  const ids = screenBenefits('We offer a 401(k), RSUs and life insurance.').map(n => n.id)
  assert.deepEqual(ids, ['pension', 'equity', 'insurance'])
})

test('pasted text gives up its title and company', () => {
  const posting = readPostingText(`Senior Data Analyst
London, hybrid

About Acme Foods
Acme Foods is a leading maker of breakfast cereals. At Acme Foods, we care about quality.

Responsibilities
• Build dashboards`)
  assert.equal(posting.title, 'Senior Data Analyst')
  assert.equal(posting.company, 'Acme Foods')
})

test('a labelled company line wins', () => {
  assert.equal(readPostingText('Title: Accountant\nCompany: Northwind Traders\nJoin Contoso today').company, 'Northwind Traders')
})

test('links are told apart from posting text', () => {
  assert.equal(looksLikeUrl('https://boards.greenhouse.io/acme/jobs/123'), true)
  assert.equal(looksLikeUrl('jobs.lever.co/acme/abc'), true)
  assert.equal(looksLikeUrl('Senior engineer\nWe build things'), false)
})

test('the employer is matched to a listing only when the names agree', async () => {
  const { pickEmployerListing } = await import('../src/services/jobEngine.js')
  const { normalizeCompanyName } = await import('../src/services/ethics.js')
  const results = [
    { symbol: 'NSRGY', name: 'Nestle SA ADR', type: 'EQUITY' },
    { symbol: 'NESN.SW', name: 'Nestlé S.A.', type: 'EQUITY' },
  ]
  assert.equal(pickEmployerListing('Nestlé', results, normalizeCompanyName).symbol, 'NSRGY')
  assert.equal(pickEmployerListing('Tesco', [{ symbol: 'TSCO.L', name: 'Tesco PLC', type: 'EQUITY' }], normalizeCompanyName).symbol, 'TSCO.L')
  assert.equal(pickEmployerListing('Acme Foods', [{ symbol: 'ACME', name: 'Acme United Corporation', type: 'EQUITY' }], normalizeCompanyName), null)
})
