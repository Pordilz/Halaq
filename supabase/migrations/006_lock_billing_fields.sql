-- 006 — lock billing & rate-limit fields against client tampering
--
-- BACKGROUND
-- The `profiles_update_own` policy in 003 correctly restricts UPDATE to a
-- user's own row, but doesn't restrict *which columns* they can write. A
-- user could open devtools and run:
--
--     await window.supabase
--       .from('profiles')
--       .update({ subscription_tier: 'scholar' })
--       .eq('id', user.id)
--
-- …and instantly bypass every paywall.  Same shape applies to
-- daily_search_count, which would let free-tier users blow past the 5/day cap.
--
-- These columns must only ever be written by the Lemon Squeezy webhook
-- (subscription_tier / status / period_end / stripe_subscription_id) or the
-- screen API rate-limiter (daily_search_count / reset_at), both of which run
-- under the service_role key. A BEFORE UPDATE trigger enforces this — it lets
-- service_role through and rejects any other role's attempt to mutate the
-- protected columns.

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
  OR NEW.stripe_subscription_id   IS DISTINCT FROM OLD.stripe_subscription_id THEN
    RAISE EXCEPTION 'subscription fields can only be modified by the billing webhook'
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

DROP TRIGGER IF EXISTS profiles_lock_billing ON public.profiles;
CREATE TRIGGER profiles_lock_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_lock_billing_fields();
