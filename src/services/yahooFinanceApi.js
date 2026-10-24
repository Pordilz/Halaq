/**
 * Halaq Yahoo Finance proxy client.
 * Hits /api/screen/:ticker (proxied to the Vercel serverless function in prod
 * and the local Express dev server in development).
 */

import { supabase } from '../lib/supabase'
import { apiUrl } from '../lib/apiBase'

export async function fetchAllScreeningData(ticker, { signal } = {}) {
  const headers = {}
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch {
    // Anonymous request — fine.
  }

  const res = await fetch(apiUrl(`/api/screen/${encodeURIComponent(ticker)}`), {
    headers,
    signal,
  })

  if (!res.ok) {
    let body
    try {
      body = await res.json()
    } catch {
      body = {}
    }
    // status + code let the page tell a quota limit (429, QUOTA_ANON /
    // QUOTA_FREE) from an unknown ticker (404) or a Yahoo outage (502/503).
    throw Object.assign(new Error(body.error || `Server error (${res.status})`), {
      status: res.status,
      code: body.code || null,
    })
  }

  const data = await res.json()
  if (!data?.profile || !data?.income || !data?.balanceSheet) {
    throw new Error('Incomplete data received. Please try a different ticker.')
  }
  return data
}
