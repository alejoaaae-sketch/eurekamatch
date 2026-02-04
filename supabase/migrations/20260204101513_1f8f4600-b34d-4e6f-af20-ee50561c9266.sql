-- Ensure RLS is enabled + forced (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picks FORCE ROW LEVEL SECURITY;

-- PICKS: make anon-deny policy RESTRICTIVE (scanner-friendly) and ensure it covers SELECT explicitly
DROP POLICY IF EXISTS "Anonymous cannot access picks" ON public.picks;
CREATE POLICY "Anonymous cannot access picks"
ON public.picks
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Anonymous cannot select picks" ON public.picks;
CREATE POLICY "Anonymous cannot select picks"
ON public.picks
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- PROFILES: ensure anon SELECT is explicitly and restrictively denied (scanner-friendly)
DROP POLICY IF EXISTS "Anonymous cannot select profiles" ON public.profiles;
CREATE POLICY "Anonymous cannot select profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);