import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _client = null;

export function getSupabaseAdmin() {
  if (_client) return _client;
  if (!url || !serviceKey) {
    return null;
  }
  _client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export async function getUserFromToken(token) {
  const admin = getSupabaseAdmin();
  if (!admin || !token) return { user: null, profile: null };
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user) return { user: null, profile: null };
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return { user, profile: profile || { subscription_tier: 'free' } };
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Enforces the daily-screen rate limit for free-tier users.
 * Returns null on success, or { status, error } if blocked.
 *
 * Uses the existing daily_search_count / daily_search_reset_at columns.
 * Atomic enough for a single-region deployment; a strict CAS implementation
 * would require an RPC, which is overkill for the current free-tier limit.
 */
export async function enforceFreeRateLimit({ user, profile, dailyLimit = 5 }) {
  const admin = getSupabaseAdmin();
  if (!admin || !user || !profile) return null;
  if (profile.subscription_tier && profile.subscription_tier !== 'free') {
    return null;
  }

  const now = new Date();
  const resetAt = profile.daily_search_reset_at
    ? new Date(profile.daily_search_reset_at)
    : null;

  let count = profile.daily_search_count || 0;
  let nextResetAt = resetAt ? resetAt.toISOString() : now.toISOString();

  if (!resetAt || now.getTime() - resetAt.getTime() > DAY_MS) {
    count = 0;
    nextResetAt = now.toISOString();
  }

  if (count >= dailyLimit) {
    return {
      status: 429,
      error: `Daily screening limit reached (${dailyLimit}/${dailyLimit}). Upgrade to Pro for unlimited access.`,
      remaining: 0,
    };
  }

  // Best-effort update; do not block the user if Supabase is briefly unavailable.
  try {
    await admin
      .from('profiles')
      .update({
        daily_search_count: count + 1,
        daily_search_reset_at: nextResetAt,
      })
      .eq('id', user.id);
  } catch (e) {
    // Swallowed: prefer letting the request through over a transient DB hiccup.
  }

  return null;
}
