import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'anon-key-placeholder'
);

lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { tier } = req.body;
  const variantId = tier === 'scholar' ? process.env.LEMON_SCHOLAR_VARIANT_ID : process.env.LEMON_PRO_VARIANT_ID;

  try {
    const newCheckout = await createCheckout(process.env.LEMON_SQUEEZY_STORE_ID, variantId, {
      checkoutData: {
        email: user.email,
        custom: {
          supabase_user_id: user.id,
          tier: tier
        }
      },
      productOptions: {
        redirectUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/settings?upgrade=success`,
        receiptButtonText: 'Return to Halaq',
        receiptLinkUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/settings`
      }
    });

    res.status(200).json({ url: newCheckout.data?.data?.attributes?.url });
  } catch (err) {
    console.error('Lemon Squeezy checkout error:', err);
    res.status(500).json({ error: 'Unable to start checkout session' });
  }
}
