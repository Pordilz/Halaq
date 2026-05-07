-- 004 — Add username
--
-- Public-facing handle that's shown on /home and /profile in place of the
-- email. Case-insensitive (citext), unique, 3–20 chars of [a-z0-9_].
-- Optional so existing accounts aren't broken; new signups are encouraged
-- to set one but it can be skipped and added later from /profile.

CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username citext;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_format_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_format_check
      CHECK (
        username IS NULL
        OR (char_length(username) BETWEEN 3 AND 20
            AND username ~ '^[a-z0-9_]+$')
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles(username)
  WHERE username IS NOT NULL;

-- Refreshed trigger: populates username from sign-up metadata, falls back
-- to NULL on collision so the row still gets created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  candidate_username text;
BEGIN
  candidate_username := NULLIF(NEW.raw_user_meta_data->>'username', '');
  IF candidate_username IS NOT NULL AND
     (char_length(candidate_username) NOT BETWEEN 3 AND 20
      OR candidate_username !~ '^[a-z0-9_]+$') THEN
    candidate_username := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name',
             NULL),
    candidate_username
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
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
