/**
 * Halaq local API server (dev only).
 * Mirrors the Vercel /api/* endpoints so Vite can proxy without deploying.
 * In production, requests go directly to the Vercel functions in /api.
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { lemonSqueezySetup, createCheckout, getSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import { createClient } from '@supabase/supabase-js';
import { fetchScreeningPayload, isValidTicker, normalizeYahooError } from '../api/_lib/yahoo.js';

const app = express();
const PORT = process.env.PORT || 3005;

if (process.env.LEMON_SQUEEZY_API_KEY) {
  lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

if (!supabaseAdmin) {
  console.warn('[Halaq API] Supabase service role key not set — auth features disabled in dev.');
}

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.VITE_APP_URL || true)
    : true,
}));

// ---- Auth helpers ----
async function requireAuth(req, res, next) {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Auth backend not configured' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  req.user = user;
  req.profile = profile || { subscription_tier: 'free' };
  next();
}

async function optionalAuth(req, res, next) {
  if (!supabaseAdmin) return next();
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (user) {
    req.user = user;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    req.profile = profile || { subscription_tier: 'free' };
  }
  next();
}

// ---- Lemon Squeezy webhook (must be registered before express.json()) ----
app.post('/api/lemonsqueezy/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'];
  if (!secret) return res.status(500).send('Webhook secret not configured');
  if (!signature) return res.status(401).send('Missing signature');

  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
  const sig = Buffer.from(signature, 'utf8');
  if (digest.length !== sig.length || !crypto.timingSafeEqual(digest, sig)) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(req.body.toString());
  const eventName = payload.meta?.event_name;
  const customData = payload.meta?.custom_data || {};
  const userId = customData.supabase_user_id;
  const sub = payload.data?.attributes || {};

  if (!supabaseAdmin || !userId) return res.status(200).json({ received: true });

  try {
    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const tierMap = {
        [process.env.LEMON_PRO_VARIANT_ID]: 'pro',
        [process.env.LEMON_SCHOLAR_VARIANT_ID]: 'scholar',
      };
      const newTier = (sub.status === 'active' || sub.status === 'on_trial')
        ? (tierMap[sub.variant_id] || 'free')
        : 'free';
      await supabaseAdmin.from('profiles').update({
        subscription_tier: newTier,
        stripe_subscription_id: payload.data.id,
        subscription_status: sub.status,
        subscription_period_end: sub.renews_at ? new Date(sub.renews_at).toISOString() : null,
      }).eq('id', userId);
    } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      await supabaseAdmin.from('profiles').update({
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        stripe_subscription_id: null,
      }).eq('id', userId);
    }
  } catch (err) {
    console.error('[Webhook] DB error:', err);
  }

  res.status(200).json({ received: true });
});

app.use(express.json({ limit: '128kb' }));

// ---- Lemon Squeezy: checkout + portal ----
app.post('/api/lemonsqueezy/create-checkout', requireAuth, async (req, res) => {
  const { tier } = req.body || {};
  if (!['pro', 'scholar'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  const variantId = tier === 'scholar'
    ? process.env.LEMON_SCHOLAR_VARIANT_ID
    : process.env.LEMON_PRO_VARIANT_ID;
  if (!process.env.LEMON_SQUEEZY_STORE_ID || !variantId) {
    return res.status(500).json({ error: 'Billing not configured' });
  }
  try {
    const newCheckout = await createCheckout(process.env.LEMON_SQUEEZY_STORE_ID, variantId, {
      checkoutData: {
        email: req.user.email,
        custom: { supabase_user_id: req.user.id, tier },
      },
      productOptions: {
        redirectUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/profile?upgrade=success`,
        receiptButtonText: 'Return to Halaq',
        receiptLinkUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/profile`,
      },
    });
    res.json({ url: newCheckout.data?.data?.attributes?.url });
  } catch (err) {
    console.error('Lemon Squeezy checkout error:', err);
    res.status(500).json({ error: 'Unable to start checkout session' });
  }
});

app.post('/api/lemonsqueezy/create-portal', requireAuth, async (req, res) => {
  const subId = req.profile.stripe_subscription_id;
  if (!subId) return res.status(400).json({ error: 'No subscription found' });
  try {
    const sub = await getSubscription(subId);
    if (sub.error) throw new Error(sub.error.message);
    const url = sub.data?.data?.attributes?.urls?.customer_portal;
    if (!url) throw new Error('Customer portal URL not generated');
    res.json({ url });
  } catch (err) {
    console.error('Portal error:', err.message || err);
    res.status(500).json({ error: err.message || 'Unable to open billing portal' });
  }
});

// ---- Screen ----
app.get('/api/screen/:ticker', optionalAuth, async (req, res) => {
  const ticker = String(req.params.ticker || '').toUpperCase();
  if (!isValidTicker(ticker)) {
    return res.status(400).json({ error: 'Invalid ticker format' });
  }

  // Free-tier daily rate limit (auth users only)
  if (req.user && req.profile?.subscription_tier === 'free') {
    const now = new Date();
    const reset = req.profile.daily_search_reset_at
      ? new Date(req.profile.daily_search_reset_at)
      : null;
    let count = req.profile.daily_search_count || 0;
    if (!reset || now.getTime() - reset.getTime() > 24 * 60 * 60 * 1000) {
      count = 0;
    }
    if (count >= 5) {
      return res.status(429).json({
        error: 'Daily screening limit reached (5/5). Upgrade to Pro for unlimited access.',
      });
    }
    if (supabaseAdmin) {
      supabaseAdmin
        .from('profiles')
        .update({
          daily_search_count: count + 1,
          daily_search_reset_at: count === 0 ? now.toISOString() : req.profile.daily_search_reset_at,
        })
        .eq('id', req.user.id)
        .then(() => {});
    }
  }

  try {
    const payload = await fetchScreeningPayload(ticker);
    res.json(payload);
  } catch (err) {
    const status = err.statusCode || 400;
    console.error(`[Halaq API] Error screening ${ticker}:`, err.message);
    res.status(status).json({ error: normalizeYahooError(err.message) });
  }
});

// ---- Search ----
app.get('/api/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q || q.length < 1 || q.length > 50) return res.json([]);
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Halaq/1.0 (+https://halaq.app)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return res.json([]);
    const data = await response.json();
    const ALLOWED = new Set(['NMS', 'NYQ', 'NGM', 'PCX', 'BTS', 'ASE', 'NAS', 'JNB']);
    const quotes = (data?.quotes || [])
      .filter(item =>
        (item.quoteType === 'EQUITY' || item.quoteType === 'ETF') &&
        (ALLOWED.has(item.exchange) || item.symbol?.endsWith('.JO'))
      )
      .slice(0, 8)
      .map(item => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchDisp || item.exchange || '',
        type: item.quoteType,
      }));
    res.json(quotes);
  } catch (err) {
    if (err?.name !== 'AbortError') console.error('[Search] Error:', err.message);
    res.json([]);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n  Halaq API server: http://localhost:${PORT}\n`);
});
