/**
 * Halaq Yahoo Finance proxy client.
 * Hits /api/screen/:ticker (proxied to the Vercel serverless function in prod
 * and the local Express dev server in development).
 */

import { supabase } from '../lib/supabase'

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

  const res = await fetch(`/api/screen/${encodeURIComponent(ticker)}`, {
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
    throw new Error(body.error || `Server error (${res.status})`)
  }

  const data = await res.json()
  if (!data?.profile || !data?.income || !data?.balanceSheet) {
    throw new Error('Incomplete data received. Please try a different ticker.')
  }
  return data
}
