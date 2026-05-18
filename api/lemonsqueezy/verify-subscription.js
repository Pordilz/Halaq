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
 */

import { lemonSqueezySetup, listSubscriptions } from '@lemonsqueezy/lemonsqueezy.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAdmin =
  supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });

const VARIANT_TO_TIER = {
  [process.env.LEMON_PRO_VARIANT_ID]: 'pro',
  [process.env.LEMON_SCHOLAR_VARIANT_ID]: 'scholar',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const userEmail = (user.email || '').trim().toLowerCase();
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
    if (subs.length === 0) {
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
    subs.sort((a, b) => {
      const r = rank(b) - rank(a);
      if (r !== 0) return r;
      const aTime = new Date(a.attributes?.created_at || 0).getTime();
      const bTime = new Date(b.attributes?.created_at || 0).getTime();
      return bTime - aTime;
    });
    const best = subs[0];
    const attrs = best.attributes || {};
    const subId = String(best.id);
    const status = attrs.status;
    const variantId = String(attrs.variant_id || '');
    const isActive = status === 'active' || status === 'on_trial';
    const newTier = isActive ? VARIANT_TO_TIER[variantId] || 'free' : 'free';

    const safeIso = (v) => {
      if (!v) return null;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    };

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: newTier,
        stripe_subscription_id: subId,
        subscription_status: status,
        subscription_period_end: safeIso(attrs.renews_at) || safeIso(attrs.ends_at),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[verify-subscription] DB update failed:', updateError);
      return res.status(500).json({ error: 'Database update failed' });
    }

    return res.status(200).json({
      ok: true,
      found: true,
      tier: newTier,
      status,
      subscriptionId: subId,
    });
  } catch (err) {
    console.error('[verify-subscription] error:', err.message || err);
    return res.status(500).json({ error: 'Internal error verifying subscription' });
  }
}
