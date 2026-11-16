-- 012 — lock profiles.methodology behind the preferences API
--
-- BACKGROUND
-- The 006/010 billing lock protects subscription fields and rate-limit
-- counters, but RLS still lets a user update their own row's `methodology`
-- (migration 003's "Profiles: update own" policy). Because methodology is a
-- paid preference, a free user could otherwise select DJIM/SP/FTSE directly
-- from devtools, and client-side tier checks in Batch.jsx / Profile.jsx were
-- the only thing standing in the way.
--
-- This migration extends the existing public.profiles_lock_billing_fields()
-- trigger with a methodology check. The complete function definition from 010
-- is reproduced so the result is self-contained and idempotent. Only
-- service_role may change these protected columns; the API handlers call the
-- service-role client, so legitimate writes (webhook, quota, and the new
-- POST /api/preferences/methodology) keep working. Client writes are rejected.
--
-- Fully qualified names + `SET search_path = ''` keep this independent of the
-- caller's search_path; the trigger is dropped/recreated so re-running the
-- migration cannot duplicate it.

CREATE OR REPLACE FUNCTION public.profiles_lock_billing_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- The Supabase service role bypasses RLS and is the only legitimate
  -- mutator of these fields. Everything else (anon, authenticated) is
  -- denied. NB: auth.role() reads the JWT claim, which the service role
  -- key sets to 'service_role'.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier        IS DISTINCT FROM OLD.subscription_tier
  OR NEW.subscription_status      IS DISTINCT FROM OLD.subscription_status
  OR NEW.subscription_period_end  IS DISTINCT FROM OLD.subscription_period_end
  OR NEW.stripe_subscription_id   IS DISTINCT FROM OLD.stripe_subscription_id
  OR NEW.billing_event_at         IS DISTINCT FROM OLD.billing_event_at THEN
    RAISE EXCEPTION 'subscription fields can only be modified by the billing webhook'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- Paid preference: clients must go through POST /api/preferences/methodology,
  -- which re-checks the tier server-side and writes as service_role. A direct
  -- UPDATE of the profile row by an authenticated user is rejected here.
  IF NEW.methodology IS DISTINCT FROM OLD.methodology THEN
    RAISE EXCEPTION 'methodology can only be modified by the preferences API'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  IF NEW.daily_search_count      IS DISTINCT FROM OLD.daily_search_count
  OR NEW.daily_search_reset_at   IS DISTINCT FROM OLD.daily_search_reset_at THEN
    RAISE EXCEPTION 'rate-limit counters can only be modified by the screen API'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger functions must not be directly executable by public roles (003/009
-- already did this; repeat it so a replayed chain stays hardened).
REVOKE ALL ON FUNCTION public.profiles_lock_billing_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_lock_billing ON public.profiles;
CREATE TRIGGER profiles_lock_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_lock_billing_fields();
