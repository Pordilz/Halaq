import { supabase } from '../lib/supabase'
import { apiUrl } from '../lib/apiBase'

const API_BASE = apiUrl('/api')

/**
 * Checkout/portal URLs come from an API response, so never send the browser
 * somewhere the API didn't intend: https only, on Lemon Squeezy itself.
 */
function safeBillingUrl(value) {
  if (typeof value !== 'string' || !value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
    if (host !== 'lemonsqueezy.com' && !host.endsWith('.lemonsqueezy.com')) return null
    return url.href
  } catch {
    return null
  }
}

function requireBillingUrl(value) {
  const safe = safeBillingUrl(value)
  if (!safe) throw new Error('We couldn’t open the billing page. Please try again.')
  return safe
}

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (supabase?.auth?.getSession) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
  }
  return headers
}

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body || {}),
  })
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const data = await res.json()
      msg = data.error || msg
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export async function createCheckoutSession(tier) {
  const { url } = await postJson('/lemonsqueezy/create-checkout', { tier })
  window.location.href = requireBillingUrl(url)
}

export async function openBillingPortal() {
  const { url } = await postJson('/lemonsqueezy/create-portal')
  window.location.href = requireBillingUrl(url)
}

/**
 * Pull the user's current Lemon Squeezy subscription state and reconcile
 * the Supabase profile to match. Use this as a fallback when the webhook
 * is slow, missing, or misconfigured — it bypasses the webhook entirely
 * and reads directly from Lemon Squeezy's own data.
 *
 * Returns { ok, found, tier, status?, subscriptionId? }.
 */
export async function verifySubscription() {
  return postJson('/lemonsqueezy/verify-subscription')
}

// Must stay in sync with complianceEngine's METHODOLOGY_KEYS. Kept local so
// importing this module doesn't pull the whole screening engine into the bundle.
const METHODOLOGY_KEYS = ['AAOIFI', 'DJIM', 'SP', 'FTSE']
const BATCH_MAX_TICKERS = 20

/**
 * The server returns full screenStock rows plus per-ticker error rows. Keep
 * only the fields the batch table reads and give them a predictable shape, so
 * an unexpected response can't break rendering (defensive client-side check).
 */
function normalizeBatchResult(row) {
  if (!row || typeof row !== 'object') return null
  const ticker = typeof row.ticker === 'string' ? row.ticker.trim() : ''
  if (!ticker) return null

  if (row.error === true) {
    return {
      ticker,
      error: true,
      statusReason: typeof row.statusReason === 'string' && row.statusReason
        ? row.statusReason
        : 'Could not fetch data',
    }
  }

  const rawRatios = Array.isArray(row.financialScreen?.ratios) ? row.financialScreen.ratios : []
  const ratios = rawRatios
    .filter(r => r && typeof r === 'object' && typeof r.key === 'string')
    .map(r => ({
      key: r.key,
      ratio: typeof r.ratio === 'number' && Number.isFinite(r.ratio) ? r.ratio : null,
      error: Boolean(r.error),
      estimated: Boolean(r.estimated),
    }))

  return {
    ...row,
    ticker,
    companyName: typeof row.companyName === 'string' ? row.companyName : ticker,
    status: typeof row.status === 'string' ? row.status : 'UNVERIFIED',
    financialScreen: { ...(row.financialScreen || {}), ratios },
  }
}

/**
 * Server-side batch screening. The endpoint re-checks the paid tier and uses
 * the account's stored methodology; the browser only sends the ticker list.
 * Returns { results: [...] } in the shape Batch.jsx renders.
 */
export async function screenBatch(tickers) {
  if (!Array.isArray(tickers) || tickers.length === 0 || tickers.length > BATCH_MAX_TICKERS) {
    throw new Error(`Enter between 1 and ${BATCH_MAX_TICKERS} tickers.`)
  }

  const data = await postJson('/batch', { tickers })
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.results) ? data.results : null
  if (!rows) throw new Error('Unexpected response from the batch screening service.')

  const results = rows.map(normalizeBatchResult).filter(Boolean)
  if (results.length === 0) throw new Error('No results were returned for this batch.')
  return { results }
}

/**
 * Change the account's screening standard. The API validates the value and
 * enforces the Pro gate server-side, then writes as service_role (the DB
 * trigger rejects direct client updates of this column).
 */
export async function updateMethodology(methodology) {
  if (typeof methodology !== 'string' || !METHODOLOGY_KEYS.includes(methodology)) {
    throw new Error('Invalid methodology.')
  }
  const data = await postJson('/preferences/methodology', { methodology })
  if (!data || typeof data.methodology !== 'string' || !METHODOLOGY_KEYS.includes(data.methodology)) {
    throw new Error('Unexpected response while saving your methodology.')
  }
  return { methodology: data.methodology }
}
