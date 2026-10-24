import crypto from 'node:crypto';
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

export const FREE_DAILY_LIMIT = 50;
export const ANON_DAILY_LIMIT = 10;

const rpcRow = data => (Array.isArray(data) ? data[0] : data);

/**
 * Enforces the daily-screen rate limit for free-tier users.
 * Returns null on success, or { status, error } if blocked.
 *
 * The check and increment happen in one statement (consume_screen_quota,
 * migration 008), so parallel requests can't all slip under the limit.
 */
export async function enforceFreeRateLimit({ user, profile, dailyLimit = FREE_DAILY_LIMIT, admin = getSupabaseAdmin() }) {
  if (!admin || !user || !profile) return null;
  if (profile.subscription_tier && profile.subscription_tier !== 'free') {
    return null;
  }

  const { data, error } = await admin.rpc('consume_screen_quota', {
    p_user_id: user.id,
    p_limit: dailyLimit,
  });
  if (error) {
    // Migration 008 not applied yet, or Supabase blipped.
    console.warn(`[quota] consume_screen_quota failed, using fallback: ${error.message}`);
    return legacyFreeRateLimit({ admin, user, profile, dailyLimit });
  }
  if (rpcRow(data)?.allowed === false) {
    return {
      status: 429,
      error: `Daily screening limit reached (${dailyLimit}/${dailyLimit}). Upgrade to Pro for unlimited access.`,
      remaining: 0,
    };
  }
  return null;
}

// Pre-008 read-modify-write check. Not atomic; only used if the RPC fails.
async function legacyFreeRateLimit({ admin, user, profile, dailyLimit }) {
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

// On Vercel both headers are set by the edge, not the client.
export function clientIp(req) {
  const header = name => {
    const value = req.headers?.[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const ip = header('x-real-ip') || header('x-forwarded-for')?.split(',')[0] || req.socket?.remoteAddress || '';
  return ip.trim() || null;
}

// Salted and rotated daily, so stored hashes can't be linked across days or
// reversed into IPs. Falls back to the service key as the salt (server-only).
export function hashClientIp(ip, {
  salt = process.env.ANON_QUOTA_SALT || serviceKey || '',
  day = new Date().toISOString().slice(0, 10),
} = {}) {
  return crypto.createHash('sha256').update(`${salt}|${day}|${ip}`).digest('hex');
}

/**
 * Daily screen limit for signed-out visitors (consume_anon_quota, migration
 * 008). Fails open if the quota store is unavailable — a Supabase blip
 * shouldn't take screening down for everyone.
 */
export async function enforceAnonRateLimit({ req, dailyLimit = ANON_DAILY_LIMIT, admin = getSupabaseAdmin() }) {
  if (!admin) return null;
  const ip = clientIp(req);
  if (!ip) return null;

  const { data, error } = await admin.rpc('consume_anon_quota', {
    p_ip_hash: hashClientIp(ip),
    p_limit: dailyLimit,
  });
  if (error) {
    console.warn(`[quota] consume_anon_quota failed, allowing request: ${error.message}`);
    return null;
  }
  if (rpcRow(data)?.allowed === false) {
    return {
      status: 429,
      error: `You've used today's ${dailyLimit} free screens. Sign in for ${FREE_DAILY_LIMIT} a day, or upgrade to Pro for unlimited.`,
    };
  }
  return null;
}
