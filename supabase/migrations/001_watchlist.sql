-- Halaq Watchlist table
-- Each user holds a small list of tickers they're tracking; status is
-- optionally cached to power the watchlist summary UI without re-screening.

CREATE TABLE IF NOT EXISTS public.watchlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  name text,
  sector text,
  exchange text,
  status text CHECK (status IS NULL OR status IN ('COMPLIANT', 'NON_COMPLIANT', 'DOUBTFUL')),
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ticker)
);

ALTER TABLE public.watchlist ADD COLUMN IF NOT EXISTS status text;

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Watchlist: read own" ON public.watchlist;
CREATE POLICY "Watchlist: read own"
  ON public.watchlist FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Watchlist: insert own" ON public.watchlist;
CREATE POLICY "Watchlist: insert own"
  ON public.watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Watchlist: delete own" ON public.watchlist;
CREATE POLICY "Watchlist: delete own"
  ON public.watchlist FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Watchlist: update own" ON public.watchlist;
CREATE POLICY "Watchlist: update own"
  ON public.watchlist FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
