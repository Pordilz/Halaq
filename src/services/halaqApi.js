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
