import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

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

// We need to parse raw body manually if bodyParser is false
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
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
  const customData = payload?.meta?.custom_data;
  const subId = payload?.data?.id;
  log(`[WEBHOOK EVENT] ${eventName}`);

  // Resolve user via custom_data first; if absent (e.g. portal-driven cancel)
  // fall back to looking up the existing profile by stored subscription id.
  let userId = customData?.supabase_user_id;
  if (!userId && subId) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subId)
      .maybeSingle();
    if (data?.id) userId = data.id;
  }
  log(`[WEBHOOK USER_ID] ${userId || 'Missing'}`);

  if (!userId) {
    console.warn('[WEBHOOK SKIP] No user resolvable for event; ignoring.');
    return res.status(200).json({ received: true, ignored: true });
  }

  // Safe ISO conversion — Lemon Squeezy occasionally returns null for
  // renews_at on the very first event, which would crash new Date(null).
  const safeIso = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  if (eventName === 'subscription_created' || eventName === 'subscription_updated' || eventName === 'subscription_resumed') {
    const sub = payload.data.attributes || {};
    const status = sub.status; // 'active', 'past_due', 'on_trial', 'cancelled', 'expired', etc.
    const tierMap = {
      [process.env.LEMON_PRO_VARIANT_ID]: 'pro',
      [process.env.LEMON_SCHOLAR_VARIANT_ID]: 'scholar',
    };
    const isActive = status === 'active' || status === 'on_trial';
    const newTier = isActive ? (tierMap[sub.variant_id] || 'free') : 'free';

    log(`[WEBHOOK DB] Updating profile ${userId} to tier: ${newTier} (status: ${status})`);
    const { error } = await supabaseAdmin.from('profiles').update({
      subscription_tier: newTier,
      stripe_subscription_id: subId,
      subscription_status: status,
      subscription_period_end: safeIso(sub.renews_at) || safeIso(sub.ends_at),
    }).eq('id', userId);

    if (error) {
      console.error('[WEBHOOK ERROR] Supabase update failed:', error);
      // Reply 500 so Lemon Squeezy retries the webhook.
      return res.status(500).json({ error: 'Database update failed' });
    }
    log('[WEBHOOK SUCCESS] Profile updated.');
  } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
    log(`[WEBHOOK DB] Cancelling profile ${userId}`);
    const { error } = await supabaseAdmin.from('profiles').update({
      subscription_tier: 'free',
      subscription_status: eventName === 'subscription_expired' ? 'expired' : 'cancelled',
    }).eq('id', userId);
    if (error) {
      console.error('[WEBHOOK ERROR] Supabase cancellation update failed:', error);
      return res.status(500).json({ error: 'Database update failed' });
    }
  }

  res.status(200).json({ received: true });
}
