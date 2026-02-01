-- Remove redundant SELECT policies on picks table
DROP POLICY IF EXISTS "Allow authenticated users to view their picks" ON public.picks;
DROP POLICY IF EXISTS "Deny anonymous access to picks" ON public.picks;

-- Keep only "Users can view their own picks" which already restricts to owner
-- (Already exists with: USING (auth.uid() = picker_id))