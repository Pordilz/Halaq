-- =====================================================================
-- 003 — Pre-deploy hardening
--
-- Reconciles local migrations with the production schema (project
-- dlkpxvkpgnbypzwhjodh) after the dashboard-driven prototype was upgraded
-- in place. Safe to re-run.
--
-- 1. Adds missing profile columns the app code expects
-- 2. Adds missing watchlist.status column + check
-- 3. Tightens handle_new_user (search_path, pulls full_name from metadata,
--    revokes public RPC EXECUTE)
-- 4. Rewrites all RLS policies to use (select auth.uid()) so the planner
--    caches the value once per query
-- 5. Drops the legacy "Public profiles viewable by everyone" policy that
--    was leaking profile rows to anonymous visitors
-- =====================================================================

-- ---------- profiles: schema additions ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS methodology text NOT NULL DEFAULT 'AAOIFI',
  ADD COLUMN IF NOT EXISTS daily_search_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_search_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier = ANY (ARRAY['free','pro','scholar','admin']));

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier
  ON public.profiles(subscription_tier);

-- ---------- watchlist: status column + check ----------
ALTER TABLE public.watchlist
  ADD COLUMN IF NOT EXISTS status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'watchlist_status_check'
  ) THEN
    ALTER TABLE public.watchlist
      ADD CONSTRAINT watchlist_status_check
      CHECK (status IS NULL OR status IN ('COMPLIANT','NON_COMPLIANT','DOUBTFUL'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);

-- ---------- portfolio_items (legacy table from a prior prototype) ----------
CREATE INDEX IF NOT EXISTS idx_portfolio_items_user_id
  ON public.portfolio_items(user_id);

-- ---------- touch_updated_at helper + trigger on profiles ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.touch_updated_at() SET search_path = '';

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- handle_new_user hardening ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name',
             NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- RLS rewrites (use (select auth.uid()) for plan caching) ----------

-- profiles: drop EVERY legacy policy first, including the public-readable one
DROP POLICY IF EXISTS "Public profiles viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Profiles: read own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING ((select auth.uid()) = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- watchlist
DROP POLICY IF EXISTS "Users can view own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can insert own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can delete own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist: read own" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist: insert own" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist: delete own" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist: update own" ON public.watchlist;

CREATE POLICY "watchlist_select_own"
  ON public.watchlist FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "watchlist_insert_own"
  ON public.watchlist FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "watchlist_update_own"
  ON public.watchlist FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "watchlist_delete_own"
  ON public.watchlist FOR DELETE
  USING ((select auth.uid()) = user_id);

-- portfolio_items (legacy)
DROP POLICY IF EXISTS "Users can select their own portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Users can insert their own portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Users can delete their own portfolio items" ON public.portfolio_items;

CREATE POLICY "portfolio_items_select_own"
  ON public.portfolio_items FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "portfolio_items_insert_own"
  ON public.portfolio_items FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "portfolio_items_delete_own"
  ON public.portfolio_items FOR DELETE
  USING ((select auth.uid()) = user_id);
