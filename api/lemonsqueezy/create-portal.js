import { lemonSqueezySetup, getSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import { createClient } from '@supabase/supabase-js';
import { applyCors } from '../_lib/cors.js';
import { bearerToken } from '../_lib/supabase.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'anon-key-placeholder'
);

lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .single();

  const subId = profile?.stripe_subscription_id;
  if (!subId) return res.status(400).json({ error: 'No subscription found' });

  const genericError = 'Unable to open billing portal';
  try {
    const sub = await getSubscription(subId);
    if (sub.error) {
      // Log details server-side only — never echo upstream error messages
      // (which can contain subscription/customer data) to the client.
      console.error('[Portal Error] Lemon Squeezy error:', sub.error.message || sub.error);
      return res.status(502).json({ error: genericError });
    }
    const url = sub.data?.data?.attributes?.urls?.customer_portal;
    if (!url) {
      // Deliberately do not log sub.data — it contains full subscription data.
      console.error('[Portal Error] No customer portal URL returned for subId:', subId);
      return res.status(502).json({ error: genericError });
    }
    return res.status(200).json({ url });
  } catch (error) {
    console.error('[Portal Error] unexpected failure:', error?.message || error);
    return res.status(500).json({ error: genericError });
  }
}
