import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePostingUrl, safeFetch, extractJsonLdPosting, extractFromHtml, htmlToText, readJobPosting } from '../api/_lib/job-posting.js'

const publicDns = async () => [{ address: '93.184.216.34', family: 4 }]
const privateDns = async () => [{ address: '10.0.0.5', family: 4 }]

function fakeFetch(routes) {
  return async url => {
    const route = routes[url.href]
    if (!route) return new Response('missing', { status: 404 })
    const { status = 200, body = '', headers = {} } = route
    return new Response(body, { status, headers: { 'content-type': 'text/html', ...headers } })
  }
}

test('only public web links are accepted', () => {
  for (const bad of ['ftp://example.com/x', 'http://localhost/jobs', 'http://127.0.0.1/', 'http://[::1]/', 'http://192.168.1.4/', 'https://user:pw@example.com/', 'https://example.com:8443/']) {
    assert.throws(() => parsePostingUrl(bad), /link/i, bad)
  }
  assert.equal(parsePostingUrl('boards.greenhouse.io/acme/jobs/1').href, 'https://boards.greenhouse.io/acme/jobs/1')
})

test('a host that resolves to a private address is refused', async () => {
  await assert.rejects(safeFetch('https://sneaky.example.com/', { resolve: privateDns, fetchImpl: fakeFetch({}) }), { code: 'BAD_URL' })
})

test('redirects are checked hop by hop', async () => {
  const fetchImpl = fakeFetch({ 'https://jobs.example.com/a': { status: 302, headers: { location: 'http://169.254.169.254/latest' } } })
  await assert.rejects(safeFetch('https://jobs.example.com/a', { resolve: publicDns, fetchImpl }), { code: 'BAD_URL' })
})

test('sites that refuse bots are reported as blocked', async () => {
  const fetchImpl = fakeFetch({ 'https://www.linkedin.com/jobs/view/1': { status: 403 } })
  await assert.rejects(readJobPosting('https://www.linkedin.com/jobs/view/1', { resolve: publicDns, fetchImpl }), { code: 'BLOCKED' })
})

const LD_PAGE = `<html><head><title>Careers</title>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"x"},{"@type":"JobPosting","title":"Data Engineer","hiringOrganization":{"@type":"Organization","name":"Acme &amp; Co","sameAs":"https://acme.example"},"jobLocation":{"@type":"Place","address":{"addressLocality":"Leeds","addressCountry":"GB"}},"employmentType":"FULL_TIME","description":"&lt;p&gt;Build pipelines.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Python&lt;/li&gt;&lt;/ul&gt;"}]}</script>
</head><body>ignored</body></html>`

test('reads the JobPosting search engines are given', () => {
  const job = extractJsonLdPosting(LD_PAGE)
  assert.equal(job.title, 'Data Engineer')
  assert.equal(job.company, 'Acme & Co')
  assert.equal(job.location, 'Leeds, GB')
  assert.equal(job.text, 'Build pipelines.\n• Python')
})

test('falls back to the page text without structured data', () => {
  const html = '<html><head><meta property="og:title" content="Junior Accountant"><meta property="og:site_name" content="Northwind"></head><body><script>x()</script><h1>Junior Accountant</h1><p>Join our finance team.</p></body></html>'
  const job = extractFromHtml(html, new URL('https://northwind.example/jobs/1'))
  assert.equal(job.title, 'Junior Accountant')
  assert.equal(job.company, 'Northwind')
  assert.equal(job.source, 'page')
  assert.match(job.text, /Join our finance team\./)
  assert.doesNotMatch(job.text, /x\(\)/)
})

test('Greenhouse links use the public job API', async () => {
  const fetchImpl = fakeFetch({
    'https://boards-api.greenhouse.io/v1/boards/acme/jobs/42': {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Analyst', company_name: 'Acme', location: { name: 'Remote' }, content: '&lt;p&gt;Analyse things for our customers every single day. '.repeat(10) + '&lt;/p&gt;' }),
    },
  })
  const job = await readJobPosting('https://boards.greenhouse.io/acme/jobs/42', { resolve: publicDns, fetchImpl })
  assert.equal(job.source, 'greenhouse')
  assert.equal(job.company, 'Acme')
  assert.equal(job.location, 'Remote')
  assert.match(job.text, /^Analyse things/)
})

test('html to text keeps list items and paragraphs apart', () => {
  assert.equal(htmlToText('<p>One&nbsp;two</p><ul><li>A</li><li>B</li></ul>'), 'One two\n• A\n• B')
})
