-- Harden RLS enforcement for privacy-sensitive tables and remove PUBLIC-scoped policies

-- Ensure RLS is enabled and forced (defense in depth)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches FORCE ROW LEVEL SECURITY;

ALTER TABLE public.matches_safe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches_safe FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- matches: keep fully locked down, but avoid PUBLIC-scoped policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "No direct access to matches" ON public.matches;
DROP POLICY IF EXISTS "Users cannot delete matches" ON public.matches;
DROP POLICY IF EXISTS "Users cannot insert matches directly" ON public.matches;
DROP POLICY IF EXISTS "Users cannot update matches" ON public.matches;

CREATE POLICY "Authenticated cannot access matches"
ON public.matches
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Anonymous cannot access matches"
ON public.matches
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- matches_safe: readable only by participants (authenticated), no writes; anon blocked
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own matches_safe" ON public.matches_safe;
DROP POLICY IF EXISTS "Users cannot delete matches_safe" ON public.matches_safe;
DROP POLICY IF EXISTS "Users cannot insert matches_safe" ON public.matches_safe;
DROP POLICY IF EXISTS "Users cannot update matches_safe" ON public.matches_safe;

CREATE POLICY "Users can view their own matches_safe"
ON public.matches_safe
FOR SELECT
TO authenticated
USING ((auth.uid() = user1_id) OR (auth.uid() = user2_id));

CREATE POLICY "Authenticated cannot insert matches_safe"
ON public.matches_safe
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Authenticated cannot update matches_safe"
ON public.matches_safe
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Authenticated cannot delete matches_safe"
ON public.matches_safe
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY "Anonymous cannot access matches_safe"
ON public.matches_safe
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- picks: explicit anon block (authenticated access already restricted to owner)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anonymous cannot access picks" ON public.picks;
CREATE POLICY "Anonymous cannot access picks"
ON public.picks
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- profiles: explicit anon block for all ops (existing authenticated policies remain)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Block anonymous profile access" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous cannot access profiles" ON public.profiles;

CREATE POLICY "Anonymous cannot access profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);
