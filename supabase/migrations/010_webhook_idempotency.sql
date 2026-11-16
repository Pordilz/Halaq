-- 010 — webhook idempotency, event ordering, and billing freshness
--
-- 1. processed_webhook_events
--    A captured, validly-signed Lemon Squeezy event could previously be
--    replayed indefinitely (e.g. replay subscription_created after a
--    cancellation to re-grant Pro). This table is a durable "seen" ledger:
--    the webhook claims an event with INSERT ... ON CONFLICT DO NOTHING and
--    silently ignores anything already present.
--
-- 2. profiles.billing_event_at
--    Idempotency alone does not stop out-of-order delivery: LS may deliver
--    an older subscription_updated *after* a newer cancellation. Storing the
--    timestamp of the last accepted billing event lets the webhook reject
--    events older than the state already applied.
--
-- Everything here is service-role only (the webhook uses the service key).

-- ---------------------------------------------------------------------
-- 1. Event ledger (RLS on, no policies, only service_role may touch it)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  event_id text PRIMARY KEY,
  event_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
-- Deliberately NO policies: with RLS enabled and no policy, anon/authenticated
-- clients get zero rows and cannot insert even if a grant were left behind.

REVOKE ALL ON TABLE public.processed_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.processed_webhook_events TO service_role;

-- ---------------------------------------------------------------------
-- 2. Monotonic billing event timestamp on profiles
-- ---------------------------------------------------------------------

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_event_at timestamptz;

-- Extend the 006 billing lock so a user cannot fast-forward their own
-- billing_event_at (via the "Profiles: update own" RLS policy) and thereby
-- block all future webhooks. Service_role is still allowed through, which is
-- the only role that legitimately writes this column.
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
