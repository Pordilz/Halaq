/**
 * /api/job-posting?url=… — reads a job posting for the Job screener.
 * Returns { url, title, company, companyUrl, location, employmentType,
 * industry, text, source }, or { error, code } when the page can't be read
 * (code BLOCKED / EMPTY / … tells the page to ask for pasted text instead).
 */

import { readJobPosting, PostingError } from './_lib/job-posting.js';

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  if (!url || url.length > 2000) {
    return res.status(400).json({ error: 'Add a link to a job posting.', code: 'BAD_URL' });
  }

  try {
    const posting = await readJobPosting(url);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(posting);
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    if (err instanceof PostingError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    console.error('[Job posting] Error:', err?.message);
    return res.status(502).json({ error: 'We couldn’t read that posting.', code: 'UNREACHABLE' });
  }
}
