-- 005 — public username availability lookup
--
-- During signup the user is anonymous (no JWT yet) and the strict RLS on
-- profiles correctly forbids them from reading rows. We still want a quick
-- "is this taken?" check before submitting the auth form. Solution: a
-- SECURITY DEFINER function that returns just a boolean, callable by
-- anon and authenticated roles. No data is leaked.

CREATE OR REPLACE FUNCTION public.is_username_taken(p_username citext)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = p_username
  );
$$;

REVOKE ALL ON FUNCTION public.is_username_taken(citext) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_taken(citext) TO anon, authenticated;
