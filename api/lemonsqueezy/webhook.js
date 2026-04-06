import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'anon-key-placeholder'
);

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

  const rawBody = await getRawBody(req);
  
  console.log('--- [WEBHOOK] Received Lemon Squeezy Event ---');
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'];
  
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

  const payload = JSON.parse(rawBody.toString('utf8'));
  const eventName = payload.meta.event_name;
  const customData = payload.meta.custom_data;
  
  console.log(`[WEBHOOK EVENT] ${eventName}`);
  const userId = customData?.supabase_user_id;
  console.log(`[WEBHOOK USER_ID] ${userId || 'Missing'}`);

  if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
    const sub = payload.data.attributes;
    const status = sub.status; // 'active', 'past_due', 'canceled', etc.
    const tierMap = {
      [process.env.LEMON_PRO_VARIANT_ID]: 'pro',
      [process.env.LEMON_SCHOLAR_VARIANT_ID]: 'scholar'
    };
    const newTier = (status === 'active' || status === 'on_trial') ? (tierMap[sub.variant_id] || 'free') : 'free';

    if (userId) {
      console.log(`[WEBHOOK DB] Updating profile ${userId} to tier: ${newTier}`);
      const { error } = await supabaseAdmin.from('profiles').update({
        subscription_tier: newTier,
        stripe_subscription_id: payload.data.id,
        subscription_status: status,
        subscription_period_end: new Date(sub.renews_at).toISOString()
      }).eq('id', userId);
      
      if (error) console.error('[WEBHOOK ERROR] Supabase Update Failed:', error);
      else console.log('[WEBHOOK SUCCESS] Profile updated!');
    }
  } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
    if (userId) {
      console.log(`[WEBHOOK DB] Cancelling profile ${userId}`);
      await supabaseAdmin.from('profiles').update({
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        stripe_subscription_id: null
      }).eq('id', userId);
    }
  }

  res.status(200).json({ received: true });
}
