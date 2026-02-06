-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Block all profile deletions" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous cannot access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous cannot select profiles" ON public.profiles;

-- Recreate policies with explicit role specifications

-- Block anonymous access completely (explicit TO anon)
CREATE POLICY "Block anonymous SELECT on profiles"
ON public.profiles FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous INSERT on profiles"
ON public.profiles FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "Block anonymous UPDATE on profiles"
ON public.profiles FOR UPDATE
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Block anonymous DELETE on profiles"
ON public.profiles FOR DELETE
TO anon
USING (false);

-- Authenticated users can only access their own profile (explicit TO authenticated)
CREATE POLICY "Authenticated users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Block all profile deletions"
ON public.profiles FOR DELETE
TO authenticated
USING (false);