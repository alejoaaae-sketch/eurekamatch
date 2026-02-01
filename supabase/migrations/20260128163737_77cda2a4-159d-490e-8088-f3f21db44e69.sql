-- Fix soft-delete failing due to SELECT policy filtering out deleted rows
-- When PostgREST returns the updated row (representation), the row must still be selectable.

DROP POLICY IF EXISTS "Users can view their own picks" ON public.picks;

CREATE POLICY "Users can view their own picks"
ON public.picks
FOR SELECT
TO authenticated
USING (auth.uid() = picker_id);
