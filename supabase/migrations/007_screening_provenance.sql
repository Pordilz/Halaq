-- Halaq screening provenance + status taxonomy split
--
-- Splits the old DOUBTFUL bucket into two:
--   REVIEW_REQUIRED — mixed-business activity passes financial screens but
--                     genuinely needs human judgement of revenue mix.
--   UNVERIFIED      — data gaps prevent a confident verdict; the new Verify
--                     flow re-fetches against SEC EDGAR to resolve.
--
-- DOUBTFUL is kept in the constraint as a deprecated value during the
-- deploy window so any cached client code still writing it won't 500.
-- Existing DOUBTFUL rows are migrated to UNVERIFIED so the watchlist
-- auto-screen loop re-screens them on the user's next visit.
--
-- New provenance columns let the UI explain *why* a verdict has a given
-- confidence (which sources were used, when the screen was run).

ALTER TABLE public.watchlist
  DROP CONSTRAINT IF EXISTS watchlist_status_check;

ALTER TABLE public.watchlist
  ADD CONSTRAINT watchlist_status_check
  CHECK (
    status IS NULL OR status IN (
      'COMPLIANT',
      'NON_COMPLIANT',
      'REVIEW_REQUIRED',
      'UNVERIFIED',
      'DOUBTFUL'  -- deprecated; remove in a follow-up migration once cached clients age out
    )
  );

UPDATE public.watchlist
  SET status = 'UNVERIFIED'
  WHERE status = 'DOUBTFUL';

ALTER TABLE public.watchlist
  ADD COLUMN IF NOT EXISTS confidence text
    CHECK (confidence IS NULL OR confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  ADD COLUMN IF NOT EXISTS data_sources_used jsonb,
  ADD COLUMN IF NOT EXISTS screened_at timestamptz;
