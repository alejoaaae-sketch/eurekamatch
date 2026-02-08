-- The existing policies are all RESTRICTIVE which means they need a PERMISSIVE policy to work with.
-- Drop restrictive SELECT policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated can read app_config" ON public.app_config;
DROP POLICY IF EXISTS "Anon can read app_config" ON public.app_config;

-- Create PERMISSIVE select policy for everyone
CREATE POLICY "Anyone can read app_config"
ON public.app_config
FOR SELECT
TO anon, authenticated
USING (true);
