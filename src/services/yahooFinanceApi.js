/**
 * Yahoo Finance API Service (via Halaq API server)
 * Calls our proxy at /api/screen/:ticker (proxied by Vite)
 * No API keys needed — unlimited requests.
 */

/**
 * Fetch all data needed for compliance screening
 * @param {string} ticker — e.g. "AAPL", "SBK.JO"
 * @returns {object} { profile, income, balanceSheet }
 */
export async function fetchAllScreeningData(ticker) {
  let headers = {}
  try {
    const { data: { session } } = await import('../lib/supabase.js').then(m => m.supabase.auth.getSession());
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  } catch(e) { /* ignore */ }

  const res = await fetch(`/api/screen/${encodeURIComponent(ticker)}`, { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error: ${res.status}`);
  }

  const data = await res.json();

  if (!data.profile || !data.income || !data.balanceSheet) {
    throw new Error('Incomplete data received. Please try a different ticker.');
  }

  return data;
}
