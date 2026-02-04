-- Drop the existing permissive policy that doesn't properly block anon access
DROP POLICY IF EXISTS "Anonymous cannot access profiles" ON public.profiles;

-- Create a proper RESTRICTIVE policy to block all anonymous access
CREATE POLICY "Anonymous cannot access profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);