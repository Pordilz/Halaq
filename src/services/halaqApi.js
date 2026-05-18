import { supabase } from '../lib/supabase'

const API_BASE = '/api'

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
  if (url) window.location.href = url
}

export async function openBillingPortal() {
  const { url } = await postJson('/lemonsqueezy/create-portal')
  if (url) window.location.href = url
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
