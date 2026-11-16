-- 011 — Database hardening follow-ups
--
-- Idempotent, safe to re-run. Object names are fully qualified so this file
-- does not depend on the caller's search_path (same discipline as 003/006/008,
-- where function bodies use `SET search_path = ''`).
--
-- Fixes:
--   1. MED  — legacy public.portfolio_items had RLS policies but RLS was never
--             enabled; anon key could read/write every row.
--   2. LOW  — public.touch_updated_at() EXECUTE was never revoked from the
--             public roles (Supabase advisor 0028 pattern).
--   3. LOW  — profiles.stripe_subscription_id needs a UNIQUE (partial) index so
--             two profiles cannot bind the same Lemon Squeezy subscription.
--   4. INFO — billing_event_at is intentionally NOT added here: migration 010
--             owns that column for webhook event ordering.
--
-- NOTE on #1: this file also declares the legacy table so that a partial /
-- replayed migration chain (or a deploy where 003's dependent objects are
-- re-applied) has the table with the columns 003's index and policies need.

-- ---------------------------------------------------------------------
-- 1. Legacy portfolio_items: define the table, then actually turn RLS on.
-- ---------------------------------------------------------------------

-- Define the minimal legacy shape expected by 003's index (user_id) and
-- policies (user_id), plus generic columns. No app code reads the data
-- columns, so keep them intentionally small. IF NOT EXISTS => re-runnable.
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- RLS was missing entirely in production: without this, the policies defined
-- in 003 are inert and the anon key can read/write every row.
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- Drop permissive legacy read policies that exposed all rows to anon/auth.
-- The include-the-period variant is defensive (000 used that naming style).
DROP POLICY IF EXISTS "Public portfolio items viewable by everyone" ON public.portfolio_items;
DROP POLICY IF EXISTS "Public portfolio items viewable by everyone." ON public.portfolio_items;
DROP POLICY IF EXISTS "Users can view all portfolio items" ON public.portfolio_items;
-- NOTE: do NOT drop the "portfolio_items_*_own" policies from 003; those are
-- the correct, restrictive policies that should remain on this table.

-- ---------------------------------------------------------------------
-- 2. Revoke public EXECUTE on the touch_updated_at trigger helper.
-- ---------------------------------------------------------------------

-- Trigger-function EXECUTE is checked at CREATE TRIGGER time, not at fire
-- time, so revoking from PUBLIC/anon/authenticated does not break the
-- profiles_touch_updated_at trigger created in 003.
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. One profile per Lemon Squeezy subscription (NULLs allowed / excluded).
-- ---------------------------------------------------------------------

-- A partial unique index enforces uniqueness only for non-null values, so
-- profiles that are not yet linked to a subscription remain unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id_unique
  ON public.profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4. billing_event_at — intentionally omitted.
-- ---------------------------------------------------------------------

-- Migration 010_webhook_idempotency.sql adds public.profiles.billing_event_at
-- (timestamptz) for webhook event ordering. We deliberately do not add it here
-- to avoid a conflicting definition; this file only comments on it.
