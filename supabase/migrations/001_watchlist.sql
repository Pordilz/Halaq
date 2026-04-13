-- Halaq Watchlist Table
-- Run this in your Supabase SQL Editor (Dashboard > SQL > New query)

-- Create the watchlist table
CREATE TABLE IF NOT EXISTS public.watchlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticker text NOT NULL,
  name text,
  sector text,
  exchange text,
  added_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, ticker)
);

-- Enable RLS
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Users can only see their own watchlist items
CREATE POLICY "Users can view own watchlist"
  ON public.watchlist FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own watchlist items
CREATE POLICY "Users can insert own watchlist"
  ON public.watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own watchlist items
CREATE POLICY "Users can delete own watchlist"
  ON public.watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- Add alerts_enabled column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'alerts_enabled'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN alerts_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Create an index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
