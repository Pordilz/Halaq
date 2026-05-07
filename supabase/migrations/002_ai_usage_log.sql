-- Halaq AI usage log
-- Records calls to AI-powered features (chat, batch insights) for billing,
-- abuse mitigation and product analytics. Read-only for users; admin-only for
-- aggregate queries via the service role.

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  ticker text,
  tokens_used integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created
  ON public.ai_usage_log(user_id, created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage: read own" ON public.ai_usage_log;
CREATE POLICY "ai_usage: read own"
  ON public.ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);
