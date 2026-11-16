import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { applyCors } from '../_lib/cors.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Server-side: prefer SUPABASE_URL, fall back to VITE_SUPABASE_URL since
// they almost always point at the same project. The service role key is
// required — without it the admin client can't write to RLS-protected tables
// AND the new profiles_lock_billing_fields trigger refuses any non-service
// role write to billing columns. We refuse to even start if it's missing.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

const debug = !!process.env.WEBHOOK_DEBUG;
const log = (...args) => { if (debug) console.log(...args); };

// ACCESS POLICY
// -------------
// * Active subscriptions (created/updated/resumed with status active|on_trial)
//   grant the paid tier matched by the variant id.
// * Cancellation is NOT an immediate revoke. Lemon Squeezy keeps a cancelled
//   subscription usable through the already-paid period (ends_at), so we keep
//   the tier, record status=cancelled, and store the period end. Access is
//   removed on subscription_expired, or at cancellation time if that stored
//   period has already elapsed.
// * Refund / pause / failed-payment / unpaid / past-due events revoke access
//   immediately and are enumerated explicitly below so an unhandled event can
//   never silently leave someone with paid access.
const REVOCATION_STATUS = {
  subscription_refunded: 'refunded',
  order_refunded: 'refunded',
  refund_created: 'refunded',
  subscription_paused: 'paused',
  subscription_payment_failed: 'past_due',
  subscription_unpaid: 'unpaid',
  subscription_past_due: 'past_due',
};

const PROFILE_COLUMNS = [
  'id',
  'email',
  'stripe_subscription_id',
  'billing_event_at',
  'subscription_tier',
  'subscription_status',
  'subscription_period_end',
].join(',');

// We need to parse raw body manually if bodyParser is false
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Safe ISO conversion — Lemon Squeezy occasionally returns null for
// renews_at on the very first event, which would crash new Date(null).
function safeIso(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// meta.custom_data may be an object or a JSON string depending on the event.
function parseCustomData(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }
  return typeof raw === 'object' ? raw : {};
}

// Prefer the event's own timestamp, then fall back to the subscription data.
function parseEventTime(payload) {
  const attrs = payload?.data?.attributes || {};
  const candidates = [payload?.meta?.created_at, attrs.created_at, attrs.updated_at];
  for (const candidate of candidates) {
    const iso = safeIso(candidate);
    if (iso) return iso;
  }
  return null;
}

async function fetchProfileBy(column, value) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq(column, value)
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

// custom_data.supabase_user_id comes straight from the Lemon Squeezy checkout
// URL and is ATTACKER-CONTROLLED: anyone can craft a checkout carrying a
// victim's user id. Only honour it when the subscription's verified email
// matches that profile and the profile has no conflicting subscription
// binding. The existing stored binding is the stronger trust anchor and wins
// on any conflict, so a binding that belongs to another user is never
// overwritten (DoS/downgrade via forged custom_data).
async function resolveProfile({ customUserId, subIds, subEmail }) {
  // Order/refund events carry their own data.id but point at the real
  // subscription via attributes.subscription_id, so check every candidate id.
  const [candidate, ...boundMatches] = await Promise.all([
    customUserId ? fetchProfileBy('id', customUserId) : Promise.resolve(null),
    ...subIds.map((id) => fetchProfileBy('stripe_subscription_id', id)),
  ]);
  const bound = boundMatches.find(Boolean) || null;

  const norm = (v) => (v || '').trim().toLowerCase();
  const mail = norm(subEmail);

  let trustedCandidate = null;
  if (candidate) {
    const bindingOk = !candidate.stripe_subscription_id
      || subIds.includes(String(candidate.stripe_subscription_id));
    const emailOk = !mail || mail === norm(candidate.email);
    if (bindingOk && emailOk) trustedCandidate = candidate;
  }

  if (trustedCandidate) {
    if (bound && bound.id !== trustedCandidate.id) {
      log('[WEBHOOK] custom_data conflicted with an existing subscription binding; using bound profile');
      return bound;
    }
    return trustedCandidate;
  }

  // Fall back to the profile already bound to this subscription id. If there
  // is none, we cannot safely decide who to update — skip the event.
  return bound || null;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Refuse to process if Supabase admin couldn't be constructed — without
  // the service role key the trigger blocks every billing-field write, so
  // we'd just rack up Lemon Squeezy retries with no chance of succeeding.
  if (!supabaseAdmin) {
    console.error('[WEBHOOK ERROR] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
    return res.status(503).send('Service not configured');
  }

  try {
    const rawBody = await getRawBody(req);

    log('--- [WEBHOOK] Received Lemon Squeezy Event ---');
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    const signature = req.headers['x-signature'];

    if (!secret) {
      console.error('[WEBHOOK ERROR] LEMON_SQUEEZY_WEBHOOK_SECRET env var is missing');
      return res.status(503).send('Webhook secret not configured');
    }
    if (!signature) {
      console.error('[WEBHOOK ERROR] Missing x-signature header');
      return res.status(401).send('Missing signature');
    }

    // HMAC verification over the RAW body — unchanged and mandatory.
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      console.error('[WEBHOOK ERROR] Invalid signature mismatch');
      return res.status(401).send('Invalid signature');
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (err) {
      console.error('[WEBHOOK ERROR] Could not parse JSON body:', err.message);
      return res.status(400).send('Invalid JSON');
    }

    const eventName = payload?.meta?.event_name;
    // Dedupe on the signed event id. Fall back to a hash of the exact raw
    // bytes so a malformed event without an id still cannot be replayed.
    const eventId = String(
      payload?.meta?.event_id
      || crypto.createHash('sha256').update(rawBody).digest('hex'),
    );
    const eventAt = parseEventTime(payload);
    const sub = payload?.data?.attributes || {};
    const payloadId = payload?.data?.id != null ? String(payload.data.id) : null;
    const relatedSubId = sub.subscription_id != null ? String(sub.subscription_id) : null;
    const subIds = [...new Set([payloadId, relatedSubId].filter(Boolean))];
    // For subscription events data.id IS the subscription id (the case that
    // binds the profile); for order/refund events it may be an order/refund
    // id, so prefer attributes.subscription_id there.
    const isSubscriptionEvent = payload?.data?.type === 'subscriptions';
    const subId = !isSubscriptionEvent && relatedSubId ? relatedSubId : payloadId;
    const customUserId = parseCustomData(payload?.meta?.custom_data).supabase_user_id;
    log(`[WEBHOOK EVENT] ${eventName}`);

    // 1) Idempotency: atomically claim the event. upsert with ignoreDuplicates
    // is INSERT ... ON CONFLICT (event_id) DO NOTHING; with .select() a replay
    // returns no row.
    let claimed;
    try {
      const result = await supabaseAdmin
        .from('processed_webhook_events')
        .upsert(
          { event_id: eventId, event_at: eventAt },
          { onConflict: 'event_id', ignoreDuplicates: true },
        )
        .select('event_id');
      if (result.error) throw result.error;
      claimed = result.data;
    } catch (err) {
      // DB failure -> 500 so Lemon Squeezy retries. We have not touched any
      // billing state yet, so retrying is safe.
      console.error('[WEBHOOK ERROR] idempotency ledger write failed:', err?.message || err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!claimed || claimed.length === 0) {
      log('[WEBHOOK] duplicate event ignored', eventId);
      return res.status(200).json({ received: true, ignored: true, reason: 'duplicate' });
    }

    // 2) Resolve the user, then 3) enforce monotonic freshness.
    let profile;
    try {
      profile = await resolveProfile({ customUserId, subIds, subEmail: sub.user_email });
      if (!profile) {
        console.warn('[WEBHOOK SKIP] No trusted user resolvable for event; ignoring.');
        return res.status(200).json({ received: true, ignored: true });
      }
      if (eventAt && profile.billing_event_at
          && new Date(eventAt).getTime() < new Date(profile.billing_event_at).getTime()) {
        log('[WEBHOOK] stale event ignored', eventName, eventAt, profile.billing_event_at);
        return res.status(200).json({ received: true, ignored: true, reason: 'stale' });
      }
    } catch (err) {
      console.error('[WEBHOOK ERROR] profile resolution failed:', err?.message || err);
      return res.status(500).json({ error: 'Database error' });
    }

    const userId = profile.id;
    log(`[WEBHOOK USER_ID] ${userId}`);

    // 4) Compute the desired state change.
    const update = {};
    const isActivation = eventName === 'subscription_created'
      || eventName === 'subscription_updated'
      || eventName === 'subscription_resumed';

    if (isActivation) {
      // Build the map conditionally: with undefined env vars the object
      // would contain the key "undefined" and grant "scholar"/"pro" to any
      // variant that stringifies that way.
      const tierMap = {};
      if (process.env.LEMON_PRO_VARIANT_ID) {
        tierMap[String(process.env.LEMON_PRO_VARIANT_ID)] = 'pro';
      }
      if (process.env.LEMON_SCHOLAR_VARIANT_ID) {
        tierMap[String(process.env.LEMON_SCHOLAR_VARIANT_ID)] = 'scholar';
      }
      const status = sub.status;
      const isActive = status === 'active' || status === 'on_trial';
      update.subscription_tier = isActive ? (tierMap[String(sub.variant_id)] || 'free') : 'free';
      update.subscription_status = status || null;
      update.subscription_period_end = safeIso(sub.renews_at) || safeIso(sub.ends_at);
      // Only activation events may bind a subscription id; the profile was
      // already validated as unbound (or already bound to this same id).
      update.stripe_subscription_id = subId;
    } else if (eventName === 'subscription_cancelled') {
      // Keep paid access until the end of the already-paid period.
      const periodEnd = safeIso(sub.ends_at)
        || safeIso(sub.renews_at)
        || safeIso(profile.subscription_period_end);
      update.subscription_status = 'cancelled';
      update.subscription_period_end = periodEnd;
      if (!periodEnd || new Date(periodEnd).getTime() <= Date.now()) {
        update.subscription_tier = 'free';
      }
      // Otherwise leave subscription_tier untouched: access until period end.
    } else if (eventName === 'subscription_expired') {
      update.subscription_tier = 'free';
      update.subscription_status = 'expired';
      update.subscription_period_end = safeIso(sub.ends_at) || safeIso(profile.subscription_period_end);
    } else if (Object.prototype.hasOwnProperty.call(REVOCATION_STATUS, eventName)) {
      update.subscription_tier = 'free';
      update.subscription_status = REVOCATION_STATUS[eventName];
      update.subscription_period_end = safeIso(sub.ends_at) || safeIso(profile.subscription_period_end);
    } else {
      // Unhandled events are acknowledged so LS stops retrying, but cause no
      // state change. They still consumed their idempotency slot above.
      log('[WEBHOOK] no handler for event', eventName);
      return res.status(200).json({ received: true, ignored: true, reason: 'unhandled' });
    }

    if (eventAt) update.billing_event_at = eventAt;

    log(`[WEBHOOK DB] Updating profile ${userId}:`, update);
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(update)
        .eq('id', userId);
      if (error) throw error;
    } catch (err) {
      console.error('[WEBHOOK ERROR] Supabase update failed:', err?.message || err);
      // Reply 500 so Lemon Squeezy retries the webhook.
      return res.status(500).json({ error: 'Database update failed' });
    }

    log('[WEBHOOK SUCCESS] Profile updated.');
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[WEBHOOK ERROR] unexpected failure:', err?.message || err);
    return res.status(500).json({ error: 'Internal webhook error' });
  }
}
