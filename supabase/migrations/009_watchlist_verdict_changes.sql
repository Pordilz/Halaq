-- 009 — watchlist verdict-change tracking
--
-- The Watchlist "Recent alerts" panel was static text. This records when a
-- saved stock's verdict changes so the app can show it.
--
-- Only changes between *decided* verdicts count (COMPLIANT, NON_COMPLIANT,
-- REVIEW_REQUIRED). UNVERIFIED means "data missing right now", so a stock that
-- goes COMPLIANT → UNVERIFIED → COMPLIANT raises nothing, while
-- COMPLIANT → UNVERIFIED → NON_COMPLIANT records COMPLIANT → NON_COMPLIANT.
-- last_decided_status carries the verdict across those UNVERIFIED gaps.
--
-- A trigger does the bookkeeping, so it covers every writer: the client's
-- auto-screen (updateStatus) and the server's Verify endpoint alike. The app
-- clears previous_status / status_changed_at to dismiss an alert.
--
-- Also revokes direct RPC access to trigger functions (Supabase advisor
-- 0028/0029). Triggers don't need EXECUTE to fire.

ALTER TABLE public.watchlist
  ADD COLUMN IF NOT EXISTS previous_status text,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_decided_status text;

-- Seed before the trigger exists, so existing rows don't raise alerts.
UPDATE public.watchlist
  SET last_decided_status = status
  WHERE status IN ('COMPLIANT', 'NON_COMPLIANT', 'REVIEW_REQUIRED')
    AND last_decided_status IS NULL;

CREATE OR REPLACE FUNCTION public.watchlist_track_verdict_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IN ('COMPLIANT', 'NON_COMPLIANT', 'REVIEW_REQUIRED') THEN
    IF TG_OP = 'UPDATE'
       AND OLD.last_decided_status IS NOT NULL
       AND NEW.status IS DISTINCT FROM OLD.last_decided_status THEN
      NEW.previous_status := OLD.last_decided_status;
      NEW.status_changed_at := now();
    END IF;
    NEW.last_decided_status := NEW.status;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.last_decided_status := OLD.last_decided_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS watchlist_track_verdict_change ON public.watchlist;
CREATE TRIGGER watchlist_track_verdict_change
  BEFORE INSERT OR UPDATE OF status ON public.watchlist
  FOR EACH ROW
  EXECUTE FUNCTION public.watchlist_track_verdict_change();

REVOKE ALL ON FUNCTION public.watchlist_track_verdict_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_lock_billing_fields() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_watchlist_status_changed
  ON public.watchlist (user_id, status_changed_at DESC)
  WHERE status_changed_at IS NOT NULL;
