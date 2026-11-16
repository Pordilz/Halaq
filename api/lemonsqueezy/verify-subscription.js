/**
 * /api/lemonsqueezy/verify-subscription
 *
 * SAFETY-NET endpoint that pulls the user's subscription state directly
 * from Lemon Squeezy and updates Supabase, bypassing the webhook entirely.
 *
 * Why this exists: webhook delivery in Lemon Squeezy depends on a correctly
 * configured Webhook URL in the dashboard. If a misconfiguration silently
 * drops events, users pay successfully but their `subscription_tier` never
 * flips from 'free'. This endpoint lets the client recover by asking
 * "what's my current subscription, really?" against Lemon Squeezy's own
 * source of truth.
 *
 * Triggered automatically by the post-checkout polling loop on /profile
 * after the webhook hasn't shown up within ~10 seconds.
 *
 * SECURITY: Lemon Squeezy's subscription list is filtered by email, which is
 * not proof of ownership on its own. We also require a verified email, prefer
 * subscriptions whose signed custom_data.supabase_user_id matches the session
 * user, require the subscription's user_email to match, and refuse to steal a
 * subscription id already bound to a different profile.
 */

import { lemonSqueezySetup, listSubscriptions } from '@lemonsqueezy/lemonsqueezy.js';
import { createClient } from '@supabase/supabase-js';
import { applyCors } from '../_lib/cors.js';
import { bearerToken } from '../_lib/supabase.js';

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAdmin =
  supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });

const norm = (v) => (v || '').trim().toLowerCase();
const isPaidTier = (t) => t === 'pro' || t === 'scholar';

function parseCustomData(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }
  return typeof raw === 'object' ? raw : {};
}

function buildVariantMap() {
  // Only add entries for configured ids — otherwise the key "undefined"
  // would map to 'scholar'/'pro' and grant paid tiers to arbitrary variants.
  const map = {};
  if (process.env.LEMON_PRO_VARIANT_ID) {
    map[String(process.env.LEMON_PRO_VARIANT_ID)] = 'pro';
  }
  if (process.env.LEMON_SCHOLAR_VARIANT_ID) {
    map[String(process.env.LEMON_SCHOLAR_VARIANT_ID)] = 'scholar';
  }
  return map;
}

const safeIso = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Supabase admin not configured' });
  }
  if (!process.env.LEMON_SQUEEZY_API_KEY) {
    return res.status(503).json({ error: 'Lemon Squeezy API key not configured' });
  }

  // Authenticate the request — only the user themselves can verify their own
  // subscription. We use their session token, not the service role key.
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // A subscription claim is only meaningful if the email is verified; an
  // unverified account could otherwise be used to claim another user's sub.
  if (user.email_verified !== true) {
    return res.status(403).json({ error: 'Email not verified' });
  }

  const userEmail = norm(user.email);
  if (!userEmail) return res.status(400).json({ error: 'No email on user account' });

  try {
    // Lemon Squeezy supports filtering subscriptions by user_email. We pick
    // the most recent ACTIVE or ON_TRIAL subscription — if a customer
    // had a Pro sub that lapsed and then bought Scholar, we want Scholar.
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    const list = await listSubscriptions({
      filter: storeId
        ? { storeId, userEmail }
        : { userEmail },
    });

    if (list.error) {
      console.error('[verify-subscription] LS list error:', list.error);
      return res.status(502).json({ error: 'Could not fetch subscriptions from Lemon Squeezy' });
    }

    const subs = list.data?.data || [];

    // Only subscriptions Lemon Squeezy reports for the authenticated email
    // are eligible. A matching email is necessary but not sufficient — the
    // custom_data binding is checked below.
    const eligible = subs.filter((s) => norm(s.attributes?.user_email) === userEmail);
    if (eligible.length === 0) {
      return res.status(200).json({
        ok: true,
        found: false,
        tier: 'free',
        message: 'No subscription found on Lemon Squeezy for this account.',
      });
    }

    // Newest active sub wins. If none are active, fall back to the newest
    // overall so we can record its status (e.g. past_due) accurately.
    const rank = (s) => {
      const status = s.attributes?.status;
      if (status === 'active' || status === 'on_trial') return 2;
      if (status === 'past_due') return 1;
      return 0;
    };
    const sorted = [...eligible].sort((a, b) => {
      const r = rank(b) - rank(a);
      if (r !== 0) return r;
      const aTime = new Date(a.attributes?.created_at || 0).getTime();
      const bTime = new Date(b.attributes?.created_at || 0).getTime();
      return bTime - aTime;
    });

    // Prefer a subscription whose signed custom_data binds it to this user.
    const bound = sorted.filter((s) => {
      const cd = parseCustomData(s.attributes?.custom_data);
      return cd.supabase_user_id != null && String(cd.supabase_user_id) === String(user.id);
    });
    const best = bound[0] || sorted[0];

    const attrs = best.attributes || {};
    const subId = String(best.id);
    const status = attrs.status;
    const variantId = String(attrs.variant_id || '');
    const variantMap = buildVariantMap();
    const isActive = status === 'active' || status === 'on_trial';
    let newTier = isActive ? (variantMap[variantId] || 'free') : 'free';
    // Never let any code path assign 'admin' or an arbitrary string.
    if (!isPaidTier(newTier)) newTier = 'free';

    // Refuse to bind a subscription id that already belongs to someone else.
    const [conflictResult, selfResult] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_subscription_id', subId)
        .limit(1),
      supabaseAdmin
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle(),
    ]);
    if (conflictResult.error) throw conflictResult.error;
    if (selfResult.error) throw selfResult.error;
    if (conflictResult.data?.length && conflictResult.data[0].id !== user.id) {
      console.error('[verify-subscription] subscription id belongs to a different profile');
      return res.status(409).json({ error: 'Subscription belongs to another account' });
    }

    const update = {
      subscription_status: status || null,
      subscription_period_end: safeIso(attrs.renews_at) || safeIso(attrs.ends_at),
      stripe_subscription_id: subId,
    };
    if (selfResult.data?.subscription_tier === 'admin') {
      // Preserve elevated privilege; this endpoint never assigns or revokes
      // admin — it only mirrors billing state from Lemon Squeezy.
      console.log('[verify-subscription] preserving existing admin tier');
    } else {
      update.subscription_tier = newTier;
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(update)
      .eq('id', user.id);

    if (updateError) {
      console.error('[verify-subscription] DB update failed:', updateError);
      return res.status(500).json({ error: 'Database update failed' });
    }

    return res.status(200).json({
      ok: true,
      found: true,
      tier: update.subscription_tier || selfResult.data?.subscription_tier || newTier,
      status,
      subscriptionId: subId,
    });
  } catch (err) {
    console.error('[verify-subscription] error:', err.message || err);
    return res.status(500).json({ error: 'Internal error verifying subscription' });
  }
}
