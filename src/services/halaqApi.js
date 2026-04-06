const API_BASE = '/api';

async function authHeaders() {
  const { data: { session } } = await import('../lib/supabase.js').then(m => m.supabase.auth.getSession());
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`
  };
}

export async function createCheckoutSession(tier) {
  const res = await fetch(`${API_BASE}/lemonsqueezy/create-checkout`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ tier })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create checkout URL');
  }
  const { url } = await res.json();
  window.location.href = url;
}

export async function openBillingPortal() {
  const res = await fetch(`${API_BASE}/lemonsqueezy/create-portal`, {
    method: 'POST',
    headers: await authHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to open billing portal');
  }
  const { url } = await res.json();
  window.location.href = url;
}
