-- Add PERMISSIVE SELECT policy for authenticated users to view their own picks
-- This is needed because all existing policies are RESTRICTIVE, and at least one PERMISSIVE policy is required for access

CREATE POLICY "Allow authenticated users to view their picks"
ON public.picks
FOR SELECT
TO authenticated
USING (auth.uid() = picker_id);