-- Fix profiles table RLS - drop duplicate policies and ensure proper protection

-- Drop existing SELECT policies (there are duplicates causing issues)
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Restrict profile access to own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous cannot delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users cannot delete profiles" ON public.profiles;

-- Create a single clear PERMISSIVE policy for authenticated users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create RESTRICTIVE policy to deny all anonymous SELECT access
CREATE POLICY "Block anonymous profile access"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Ensure only one delete policy exists
CREATE POLICY "Block all profile deletions"
ON public.profiles
FOR DELETE
USING (false);