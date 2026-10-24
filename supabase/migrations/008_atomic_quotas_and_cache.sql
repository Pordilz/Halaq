-- 008 — atomic screening quotas + shared screening cache
--
-- 1. consume_screen_quota
--    The free-tier daily limit was a read-modify-write from the API: read
--    daily_search_count, compare, write count + 1. Parallel requests all read
--    the same count and all passed. This checks and increments in one UPDATE
--    (Postgres re-checks the WHERE clause under the row lock), with the same
--    window as before: the count resets 24h after daily_search_reset_at.
--
-- 2. anon_screen_usage + consume_anon_quota
--    Anonymous screening had no limit: api/screen assumed a Vercel edge rule
--    that was never configured, so a script could drive unlimited Yahoo
--    traffic through our IPs. Keyed by a salted, daily-rotating SHA-256 of
--    the client IP — raw IPs are never stored. Old rows are pruned on write.
--
-- 3. screening_cache
--    Normalised Yahoo payloads shared across serverless instances, so a
--    repeat screen skips the four Yahoo calls and a Yahoo outage can fall
--    back to the last good copy.
--
-- Everything here is service-role only: the API calls it with the service
-- key (which also satisfies the profiles_lock_billing trigger from 006).

-- ---------------------------------------------------------------------
-- 1. Free-tier quota
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.consume_screen_quota(p_user_id uuid, p_limit integer)
RETURNS TABLE (allowed boolean, used integer)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_used integer;
BEGIN
  UPDATE public.profiles p
     SET daily_search_count = CASE
           WHEN p.daily_search_reset_at IS NULL
             OR p.daily_search_reset_at < now() - interval '24 hours' THEN 1
           ELSE p.daily_search_count + 1
         END,
         daily_search_reset_at = CASE
           WHEN p.daily_search_reset_at IS NULL
             OR p.daily_search_reset_at < now() - interval '24 hours' THEN now()
           ELSE p.daily_search_reset_at
         END
   WHERE p.id = p_user_id
     AND (p.daily_search_reset_at IS NULL
          OR p.daily_search_reset_at < now() - interval '24 hours'
          OR p.daily_search_count < p_limit)
  RETURNING p.daily_search_count INTO v_used;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_used;
    RETURN;
  END IF;

  -- Over the limit, or no profile row (allowed — signup creates one, and a
  -- missing row shouldn't lock a user out).
  SELECT p.daily_search_count INTO v_used FROM public.profiles p WHERE p.id = p_user_id;
  RETURN QUERY SELECT v_used IS NULL, COALESCE(v_used, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_screen_quota(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_screen_quota(uuid, integer) TO service_role;

-- ---------------------------------------------------------------------
-- 2. Anonymous quota
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.anon_screen_usage (
  ip_hash text NOT NULL,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, day)
);

-- No policies: only the service role (which bypasses RLS) can touch it.
ALTER TABLE public.anon_screen_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.anon_screen_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_anon_quota(p_ip_hash text, p_limit integer)
RETURNS TABLE (allowed boolean, used integer)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'utc')::date;
  v_used integer;
  v_allowed boolean;
BEGIN
  INSERT INTO public.anon_screen_usage AS u (ip_hash, day, count)
  VALUES (p_ip_hash, v_day, 1)
  ON CONFLICT (ip_hash, day) DO UPDATE
    SET count = u.count + 1
    WHERE u.count < p_limit
  RETURNING u.count INTO v_used;
  -- Capture before the DELETE below resets FOUND.
  v_allowed := FOUND;

  -- Keep roughly two days of rows without a cron job.
  IF random() < 0.01 THEN
    DELETE FROM public.anon_screen_usage WHERE day < v_day - 1;
  END IF;

  IF v_allowed THEN
    RETURN QUERY SELECT true, v_used;
  ELSE
    RETURN QUERY SELECT false, p_limit;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_anon_quota(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_anon_quota(text, integer) TO service_role;

-- ---------------------------------------------------------------------
-- 3. Screening cache
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.screening_cache (
  ticker text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.screening_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.screening_cache FROM anon, authenticated;
