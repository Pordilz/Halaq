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
