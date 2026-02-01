-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policy and create a more explicit one
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create restrictive policy that explicitly requires authentication
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add explicit deny for anonymous users (belt and suspenders approach)
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Also secure INSERT and UPDATE policies with explicit role
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also apply same treatment to picks table
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own picks" ON public.picks;
CREATE POLICY "Users can view their own picks"
ON public.picks
FOR SELECT
TO authenticated
USING (auth.uid() = picker_id AND deleted_at IS NULL);

CREATE POLICY "Deny anonymous access to picks"
ON public.picks
FOR SELECT
TO anon
USING (false);

DROP POLICY IF EXISTS "Users can create picks" ON public.picks;
CREATE POLICY "Users can create picks"
ON public.picks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = picker_id);

DROP POLICY IF EXISTS "Users can soft delete their own picks" ON public.picks;
CREATE POLICY "Users can soft delete their own picks"
ON public.picks
FOR UPDATE
TO authenticated
USING (auth.uid() = picker_id)
WITH CHECK (auth.uid() = picker_id);

DROP POLICY IF EXISTS "Users cannot hard delete picks" ON public.picks;
CREATE POLICY "Users cannot hard delete picks"
ON public.picks
FOR DELETE
TO authenticated
USING (false);