/**
 * Reads a job posting from a link: Greenhouse and Lever through their public
 * job APIs, anything else through the schema.org JobPosting most job pages
 * embed for search engines, falling back to the page's text.
 *
 * The link comes from a user, so it's fetched with care: http(s) only, the
 * standard ports, no addresses on private networks (checked again after each
 * redirect), a time limit and a size limit. Only the extracted fields go back
 * to the browser, never the raw page.
 */

import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { readPostingText } from '../../src/services/jobEngine.js';

const TIMEOUT_MS = 8000;
// The whole read, redirects and API fallbacks included, has to finish well
// inside the function's 20 seconds.
const TOTAL_MS = 14000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;
const MAX_TEXT = 20_000;

const UA = 'Mozilla/5.0 (compatible; HalaqJobReader/1.0; +https://halaq.app)';

export class PostingError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// ── URL safety ──────────────────────────────────────────────────────────

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7));
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

export function parsePostingUrl(input) {
  let raw = String(input || '').trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) {
    throw new PostingError('BAD_URL', 'Only ordinary web links can be read.', 400);
  }
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new PostingError('BAD_URL', 'That doesn’t look like a link.', 400);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new PostingError('BAD_URL', 'Only ordinary web links can be read.', 400);
  }
  if (url.port && !['80', '443'].includes(url.port)) {
    throw new PostingError('BAD_URL', 'Only ordinary web links can be read.', 400);
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || (net.isIP(host) && isPrivateAddress(host))) {
    throw new PostingError('BAD_URL', 'Only public web links can be read.', 400);
  }
  return url;
}

async function assertPublicHost(url, resolve) {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new PostingError('BAD_URL', 'Only public web links can be read.', 400);
    return;
  }
  let addresses;
  try {
    addresses = await resolve(host);
  } catch {
    throw new PostingError('UNREACHABLE', 'We couldn’t find that website.', 422);
  }
  if (!addresses.length || addresses.some(a => isPrivateAddress(a.address))) {
    throw new PostingError('BAD_URL', 'Only public web links can be read.', 400);
  }
}

const defaultResolve = host => lookup(host, { all: true });

/** Fetches a public URL, following redirects by hand so each hop is checked. */
export async function safeFetch(input, { accept = 'text/html,application/json;q=0.9,*/*;q=0.5', resolve = defaultResolve, fetchImpl = fetch, deadline = Date.now() + TOTAL_MS } = {}) {
  let url = input instanceof URL ? input : parsePostingUrl(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url, resolve);
    const left = Math.min(TIMEOUT_MS, deadline - Date.now());
    if (left <= 0) throw new PostingError('UNREACHABLE', 'The job site took too long to answer.', 422);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), left);
    let res;
    try {
      res = await fetchImpl(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': UA, Accept: accept, 'Accept-Language': 'en' },
      });
    } catch (err) {
      clearTimeout(timer);
      throw new PostingError('UNREACHABLE', err?.name === 'AbortError' ? 'The job site took too long to answer.' : 'We couldn’t reach that website.', 422);
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      clearTimeout(timer);
      url = parsePostingUrl(new URL(res.headers.get('location'), url).href);
      continue;
    }
    try {
      if ([401, 403, 429, 999].includes(res.status)) {
        throw new PostingError('BLOCKED', 'That job site doesn’t let us read its postings.', 422);
      }
      if (!res.ok) throw new PostingError('NOT_FOUND', 'We couldn’t open that posting. It may have closed.', 422);
      const body = await readCapped(res);
      return { url, body, contentType: res.headers.get('content-type') || '' };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new PostingError('UNREACHABLE', 'That link redirects too many times.', 422);
}

async function readCapped(res) {
  if (!res.body?.getReader) {
    const text = await res.text();
    return text.slice(0, MAX_BYTES);
  }
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    chunks.push(value);
    if (size >= MAX_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map(c => Buffer.from(c))));
}

// ── HTML to text ────────────────────────────────────────────────────────

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', bull: '•', pound: '£', euro: '€' };

export function decodeEntities(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

export function htmlToText(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<(script|style|noscript|svg|template|head)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|section|article|tr|ul|ol)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n+• /g, '\n• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Extraction ──────────────────────────────────────────────────────────

const slugToName = slug =>
  decodeURIComponent(slug).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();

function placeText(location) {
  const places = (Array.isArray(location) ? location : [location]).filter(Boolean);
  return places
    .map(p => {
      const a = p.address || p;
      if (typeof a === 'string') return a;
      const country = typeof a.addressCountry === 'string' ? a.addressCountry : a.addressCountry?.name;
      return [a.addressLocality, a.addressRegion, country].filter(Boolean).join(', ');
    })
    .filter(Boolean)
    .join('; ');
}

function findJobPosting(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findJobPosting(n);
      if (hit) return hit;
    }
    return null;
  }
  const type = node['@type'];
  if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) return node;
  return findJobPosting(node['@graph']);
}

export function extractJsonLdPosting(html) {
  const scripts = String(html || '').matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, json] of scripts) {
    let data;
    try {
      data = JSON.parse(json.trim());
    } catch {
      continue;
    }
    const job = findJobPosting(data);
    if (!job) continue;
    const org = job.hiringOrganization;
    return {
      title: decodeEntities(job.title || '').trim(),
      company: decodeEntities(typeof org === 'string' ? org : org?.name || '').trim(),
      companyUrl: typeof org === 'object' ? org?.sameAs || org?.url || '' : '',
      location: job.jobLocationType === 'TELECOMMUTE' && !job.jobLocation ? 'Remote' : placeText(job.jobLocation),
      employmentType: [].concat(job.employmentType || []).join(', '),
      industry: typeof job.industry === 'string' ? job.industry : '',
      text: htmlToText(decodeEntities(job.description || '')),
    };
  }
  return null;
}

function metaContent(html, name) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, 'i');
  return decodeEntities(html.match(re)?.[1] || html.match(reversed)?.[1] || '').trim();
}

export function extractFromHtml(html, url) {
  const ld = extractJsonLdPosting(html);
  if (ld && (ld.title || ld.text)) return { ...ld, source: 'schema' };

  const body = htmlToText(html.match(/<body[\s\S]*<\/body>/i)?.[0] || html);
  const guess = readPostingText(body);
  const pageTitle = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
  return {
    title: metaContent(html, 'og:title') || pageTitle || guess.title,
    company: metaContent(html, 'og:site_name') || guess.company || '',
    companyUrl: url.origin,
    location: guess.location,
    employmentType: '',
    industry: '',
    text: body,
    source: 'page',
  };
}

// Greenhouse: boards.greenhouse.io/{board}/jobs/{id}, job-boards.greenhouse.io/…,
// or a company careers page with ?gh_jid={id}&board= (rare; not handled).
const GREENHOUSE = /^(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io$/;
// Lever: jobs.lever.co/{company}/{uuid}
const LEVER = /^jobs(?:\.eu)?\.lever\.co$/;

async function readGreenhouse(url, opts) {
  const [, board, , id] = url.pathname.split('/');
  if (!board || !id) return null;
  const api = new URL(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${encodeURIComponent(id)}`);
  const { body } = await safeFetch(api, { ...opts, accept: 'application/json' });
  const job = JSON.parse(body);
  return {
    title: job.title || '',
    company: job.company_name || slugToName(board),
    companyUrl: '',
    location: job.location?.name || '',
    employmentType: '',
    industry: '',
    text: htmlToText(decodeEntities(job.content || '')),
    source: 'greenhouse',
  };
}

async function readLever(url, opts) {
  const [, company, id] = url.pathname.split('/');
  if (!company || !id) return null;
  const api = new URL(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}/${encodeURIComponent(id)}`);
  const { body } = await safeFetch(api, { ...opts, accept: 'application/json' });
  const job = JSON.parse(body);
  const lists = (job.lists || []).map(l => `${l.text}\n${htmlToText(l.content)}`).join('\n\n');
  return {
    title: job.text || '',
    company: slugToName(company),
    companyUrl: '',
    location: job.categories?.location || '',
    employmentType: job.categories?.commitment || '',
    industry: '',
    text: [job.descriptionPlain, lists, job.additionalPlain].filter(Boolean).join('\n\n'),
    source: 'lever',
  };
}

/** Reads the posting at `input` and returns its fields. */
export async function readJobPosting(input, options = {}) {
  const opts = { deadline: Date.now() + TOTAL_MS, ...options };
  const url = parsePostingUrl(input);
  let posting = null;
  try {
    if (GREENHOUSE.test(url.hostname)) posting = await readGreenhouse(url, opts);
    else if (LEVER.test(url.hostname)) posting = await readLever(url, opts);
  } catch (err) {
    if (err instanceof PostingError && err.code === 'BAD_URL') throw err;
    posting = null; // fall back to reading the page itself
  }
  if (!posting) {
    const { body, contentType } = await safeFetch(url, opts);
    if (!/html|xml|text\/plain/i.test(contentType) && !/<html|<body/i.test(body.slice(0, 2000))) {
      throw new PostingError('NOT_A_PAGE', 'That link isn’t a web page we can read.', 422);
    }
    posting = extractFromHtml(body, url);
  }

  const text = (posting.text || '').slice(0, MAX_TEXT);
  if (text.length < 200 && !posting.title) {
    // Pages that draw everything with JavaScript, and sign-in walls, end up here.
    throw new PostingError('EMPTY', 'We couldn’t find the job description on that page.', 422);
  }
  return {
    url: url.href,
    title: posting.title.slice(0, 200),
    company: posting.company.slice(0, 120),
    companyUrl: posting.companyUrl || '',
    location: posting.location.slice(0, 200),
    employmentType: posting.employmentType,
    industry: posting.industry,
    text,
    source: posting.source,
  };
}
