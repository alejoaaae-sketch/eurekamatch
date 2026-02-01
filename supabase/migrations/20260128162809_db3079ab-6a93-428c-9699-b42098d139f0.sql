-- Drop the restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can soft delete their own picks" ON public.picks;

-- Create a PERMISSIVE UPDATE policy instead
CREATE POLICY "Users can soft delete their own picks"
ON public.picks
FOR UPDATE
TO authenticated
USING (auth.uid() = picker_id)
WITH CHECK (auth.uid() = picker_id);