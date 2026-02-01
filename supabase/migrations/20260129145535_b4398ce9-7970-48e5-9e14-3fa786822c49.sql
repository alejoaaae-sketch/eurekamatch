-- Add explicit RESTRICTIVE policy to ensure users can only view their own profile
-- This adds an additional security layer to prevent access to other users' data

CREATE POLICY "Restrict profile access to own profile only"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);