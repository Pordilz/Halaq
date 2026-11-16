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
// Search is autocomplete, not a screen: much higher, but still bounded.
export const ANON_SEARCH_LIMIT = 120;

const rpcRow = data => (Array.isArray(data) ? data[0] : data);

/**
 * Strictly parse `Authorization: Bearer <token>`.
 *
 * The old `authorization?.replace('Bearer ', '')` was unanchored: it accepted
 * a bare token, embedded whitespace, a missing token, and trailing garbage.
 * Callers use the result as a credential, so parse it with an anchored regex
 * and return null for anything else.
 */
export function bearerToken(req) {
  let raw;
  if (typeof req === 'string') {
    // Also accept a raw header value, for callers that already extracted it.
    raw = req;
  } else {
    const headers = req?.headers;
    if (!headers) return null;
    raw = headers.authorization;
    if (raw === undefined) {
      // Node lowercases incoming header names, but be defensive with
      // hand-built request objects and non-Node adapters.
      const key = Object.keys(headers).find(name => name.toLowerCase() === 'authorization');
      raw = key === undefined ? undefined : headers[key];
    }
  }
  if (typeof raw !== 'string') return null;
  const match = /^Bearer\s+(\S+)$/i.exec(raw.trim());
  return match ? match[1] : null;
}

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

// Pre-008 read-modify-write check, used only if the RPC is missing. The
// update is still a single conditional statement: `lt(daily_search_count,
// limit)` is re-evaluated under the row lock, so concurrent requests cannot
// all pass after reading the same count. Unlike the old version, a failed
// update is surfaced instead of silently letting the request through.
async function legacyFreeRateLimit({ admin, user, profile, dailyLimit }) {
  const now = new Date();
  const resetAt = profile.daily_search_reset_at
    ? new Date(profile.daily_search_reset_at)
    : null;
  const windowExpired = !resetAt || now.getTime() - resetAt.getTime() > DAY_MS;
  const count = windowExpired ? 0 : (profile.daily_search_count || 0);

  if (count >= dailyLimit) {
    return {
      status: 429,
      error: `Daily screening limit reached (${dailyLimit}/${dailyLimit}). Upgrade to Pro for unlimited access.`,
      remaining: 0,
    };
  }

  const nextResetAt = windowExpired ? now.toISOString() : resetAt.toISOString();
  let query = admin
    .from('profiles')
    .update({
      daily_search_count: count + 1,
      daily_search_reset_at: nextResetAt,
    })
    .eq('id', user.id);

  // Supabase/PostgREST chain: the WHERE clause re-checks the limit and
  // select() (RETURNING) tells us whether this request actually got a slot.
  // The typeof guards keep compatibility with lightweight clients/mocks that
  // resolve a plain { error } from eq() when select() isn't available.
  if (typeof query.lt === 'function') query = query.lt('daily_search_count', dailyLimit);
  if (typeof query.select === 'function') query = query.select('id');

  const { data, error } = await query;
  if (error) {
    console.warn(`[quota] fallback profile update failed: ${error.message}`);
    return {
      status: 503,
      error: 'Quota service is temporarily unavailable. Please try again shortly.',
    };
  }
  if (Array.isArray(data) && data.length === 0) {
    // Another request took the last slot between our read and this write.
    return {
      status: 429,
      error: `Daily screening limit reached (${dailyLimit}/${dailyLimit}). Upgrade to Pro for unlimited access.`,
      remaining: 0,
    };
  }
  return null;
}

function isVercel() {
  return Boolean(process.env.VERCEL);
}

function trustedProxyHops() {
  const value = process.env.TRUST_PROXY;
  if (value === undefined || value === null || value === '') return 0;
  const hops = Number(value);
  return Number.isFinite(hops) && hops > 0 ? Math.floor(hops) : 0;
}

/**
 * Client IP used as the anon-quota key.
 *
 * Forwarding headers are only trusted when the request really came through a
 * proxy we control: Vercel sets x-vercel-forwarded-for at the edge, and a
 * self-hosted Express server can opt in with TRUST_PROXY (mirroring
 * `app.set('trust proxy', ...)`). Otherwise the only unforgeable value is the
 * direct socket peer — trusting client-supplied x-real-ip/x-forwarded-for
 * made the anon quota trivially bypassable (send a fresh header each request).
 * The salted, daily-rotating hash downstream keeps raw IPs out of the DB.
 */
export function clientIp(req) {
  const header = name => {
    const value = req?.headers?.[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const first = value => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? text.split(',')[0].trim() : '';
  };

  const vercel = isVercel();
  const hops = trustedProxyHops();
  if (vercel || hops > 0) {
    if (vercel) {
      // Set by Vercel's edge; a client cannot choose its value.
      const forwarded = first(header('x-vercel-forwarded-for') || header('x-forwarded-for'));
      if (forwarded) return forwarded;
    } else {
      // x-real-ip is overwritten by our proxy with its peer. For
      // x-forwarded-for (which proxies append to), count `hops` entries from
      // the right so a client-supplied prefix can't pose as the real peer.
      const realIp = first(header('x-real-ip'));
      if (realIp) return realIp;
      const parts = String(header('x-forwarded-for') || '').split(',').map(p => p.trim()).filter(Boolean);
      const peer = parts[Math.max(0, parts.length - 1 - hops)];
      if (peer) return peer;
    }
  }

  // Default (direct connection): the peer address cannot be spoofed.
  const socketIp = first(req?.socket?.remoteAddress);
  if (socketIp) return socketIp;

  // No socket at all (test harnesses / adapters without one): forwarding
  // headers are the only address signal available, so use them as a fallback.
  return first(header('x-vercel-forwarded-for') || header('x-real-ip') || header('x-forwarded-for')) || null;
}

// Salted and rotated daily, so stored hashes can't be linked across days or
// reversed into IPs. Falls back to the service key as the salt (server-only).
export function hashClientIp(ip, {
  salt = process.env.ANON_QUOTA_SALT || serviceKey || '',
  day = new Date().toISOString().slice(0, 10),
} = {}) {
  return crypto.createHash('sha256').update(`${salt}|${day}|${ip}`).digest('hex');
}

// ---------------------------------------------------------------------------
// In-process fixed windows
// ---------------------------------------------------------------------------
// Used as a fail-closed fallback when the anon quota RPC is unavailable, and
// for the cheap search limiter. Atomic for a single Node instance (the local
// Express server); on Vercel each instance has its own map, so a distributed
// outage allows at most `limit` per IP *per instance* — bounded, never open.

const fixedWindows = new Map();
const MAX_FIXED_WINDOWS = 5000;

function pruneWindows(now, windowMs) {
  if (fixedWindows.size <= MAX_FIXED_WINDOWS) return;
  for (const [key, entry] of fixedWindows) {
    if (now - entry.start >= windowMs) fixedWindows.delete(key);
  }
  while (fixedWindows.size > MAX_FIXED_WINDOWS) {
    fixedWindows.delete(fixedWindows.keys().next().value);
  }
}

function takeSlot(key, limit, windowMs) {
  const now = Date.now();
  let entry = fixedWindows.get(key);
  if (!entry || now - entry.start >= windowMs) {
    entry = { start: now, count: 0 };
    fixedWindows.set(key, entry);
    pruneWindows(now, windowMs);
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

function releaseSlot(key) {
  const entry = fixedWindows.get(key);
  if (entry && entry.count > 0) entry.count -= 1;
}

function anonBlocked(dailyLimit) {
  return {
    status: 429,
    error: `You've used today's ${dailyLimit} free screens. Sign in for ${FREE_DAILY_LIMIT} a day, or upgrade to Pro for unlimited.`,
  };
}

/**
 * Daily screen limit for signed-out visitors (consume_anon_quota, migration
 * 008). Fails closed: if the store is unavailable, or there is no trustworthy
 * client address, an in-process fixed window still bounds the caller to
 * `dailyLimit` per day instead of granting unlimited upstream traffic.
 */
export async function enforceAnonRateLimit({ req, dailyLimit = ANON_DAILY_LIMIT, admin = getSupabaseAdmin() }) {
  const ip = clientIp(req);
  if (!ip) {
    return {
      status: 503,
      error: 'Could not determine your client address. Please retry from a supported browser.',
    };
  }
  const ipHash = hashClientIp(ip);

  if (!admin) {
    return takeSlot(ipHash, dailyLimit, DAY_MS) ? null : anonBlocked(dailyLimit);
  }

  let data;
  let error;
  try {
    ({ data, error } = await admin.rpc('consume_anon_quota', {
      p_ip_hash: ipHash,
      p_limit: dailyLimit,
    }));
  } catch (err) {
    error = err;
  }
  if (error) {
    console.warn(`[quota] consume_anon_quota failed, using local fallback: ${error.message}`);
    return takeSlot(ipHash, dailyLimit, DAY_MS) ? null : anonBlocked(dailyLimit);
  }
  if (rpcRow(data)?.allowed === false) return anonBlocked(dailyLimit);
  return null;
}

/**
 * Cheap per-IP limiter for /api/search. Synchronous and in-process: no DB
 * round trip, and identical queries are normally answered by the CDN before
 * they ever reach the function. Fail-closed when no client address is known.
 */
export function enforceSearchRateLimit({ req, limit = ANON_SEARCH_LIMIT, windowMs = HOUR_MS } = {}) {
  const ip = clientIp(req);
  if (!ip) {
    return { status: 503, error: 'Search is temporarily unavailable.' };
  }
  const key = `search|${hashClientIp(ip)}`;
  if (!takeSlot(key, limit, windowMs)) {
    return {
      status: 429,
      error: 'Too many searches. Please slow down and try again shortly.',
    };
  }
  return null;
}

/**
 * Return a quota slot consumed immediately before an upstream fetch that
 * failed (unknown ticker, Yahoo outage), so a bad symbol doesn't cost the
 * visitor a screen. Best-effort, called with the same { req, user } used to
 * charge the slot in api/screen/[ticker].js.
 *
 * Tradeoff: migration 008 added consume_* RPCs but no atomic refund RPC, so
 * this is a guarded read-modify-write on the quota tables. Under concurrency
 * it can under-refund, never over-refund — the worst case is the visitor
 * losing one slot, which is the safe direction. A future migration should
 * replace these with atomic `refund_*` RPCs. Errors are logged, never thrown:
 * refunding must not turn a clean 404/502 into a 500.
 */
export async function refundQuota({ req, user, admin = getSupabaseAdmin() }) {
  const ip = user ? null : clientIp(req);
  if (!user && !ip) return;

  if (!admin) {
    if (ip) releaseSlot(hashClientIp(ip));
    return;
  }

  try {
    if (user?.id) {
      await refundFreeSlot(admin, user.id);
    } else {
      const ipHash = hashClientIp(ip);
      await refundAnonSlot(admin, ipHash);
      releaseSlot(ipHash);
    }
  } catch (err) {
    console.warn(`[quota] refund failed: ${err?.message || err}`);
  }
}

async function refundFreeSlot(admin, userId) {
  const { data, error } = await admin
    .from('profiles')
    .select('daily_search_count')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return;
  const count = Math.max(0, Number(data.daily_search_count) || 0);
  if (count === 0) return;
  const { error: updateError } = await admin
    .from('profiles')
    .update({ daily_search_count: count - 1 })
    .eq('id', userId);
  if (updateError) console.warn(`[quota] free refund update failed: ${updateError.message}`);
}

async function refundAnonSlot(admin, ipHash) {
  const day = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin
    .from('anon_screen_usage')
    .select('count')
    .eq('ip_hash', ipHash)
    .eq('day', day)
    .maybeSingle();
  if (error || !data) return;
  const count = Math.max(0, Number(data.count) || 0);
  if (count === 0) return;
  const { error: updateError } = await admin
    .from('anon_screen_usage')
    .update({ count: count - 1 })
    .eq('ip_hash', ipHash)
    .eq('day', day);
  if (updateError) console.warn(`[quota] anon refund update failed: ${updateError.message}`);
}
