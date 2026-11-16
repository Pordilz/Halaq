/**
 * POST /api/preferences/methodology — change the account's screening standard.
 *
 * Methodology is a Pro preference, but the RLS "update own profile" policy
 * lets any signed-in user write their own row. Migration 012 therefore locks
 * the column with a BEFORE UPDATE trigger that only lets service_role through.
 * This handler is the one legitimate path: it re-reads the tier from the DB on
 * every call, validates the value against the engine's allowlist, and writes
 * with the service-role client (which the trigger permits).
 *
 * Error messages are intentionally generic so this endpoint can't be used to
 * enumerate accounts or probe internal state.
 */

import { METHODOLOGY_KEYS } from '../../src/services/complianceEngine.js';
import { getSupabaseAdmin, getUserFromToken, bearerToken } from '../_lib/supabase.js';
import { applyCors } from '../_lib/cors.js';

const PAID_TIERS = new Set(['pro', 'scholar', 'admin']);
const FREE_METHODOLOGY = 'AAOIFI';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = bearerToken(req);
  const { user, profile } = token ? await getUserFromToken(token) : { user: null, profile: null };
  if (!user) return res.status(401).json({ error: 'Sign in to change your methodology.' });

  const body = req.body;
  const requested = body && typeof body === 'object' && !Array.isArray(body) ? body.methodology : undefined;
  if (typeof requested !== 'string' || !METHODOLOGY_KEYS.includes(requested)) {
    return res.status(400).json({ error: 'Invalid methodology.' });
  }
  if (requested !== FREE_METHODOLOGY && !PAID_TIERS.has(profile?.subscription_tier)) {
    return res.status(403).json({ error: 'Changing methodology is a Pro feature.', code: 'UPGRADE_REQUIRED' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(503).json({ error: 'Preferences are temporarily unavailable.' });
  }

  try {
    const { data, error } = await admin
      .from('profiles')
      .update({ methodology: requested })
      .eq('id', user.id)
      .select('methodology')
      .maybeSingle();
    if (error) throw error;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ methodology: data?.methodology || requested });
  } catch (err) {
    // Never expose the raw DB error (constraint names, SQL, etc.).
    console.error('[preferences/methodology] update failed:', err?.message || err);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Could not save your methodology. Please try again.' });
  }
}
