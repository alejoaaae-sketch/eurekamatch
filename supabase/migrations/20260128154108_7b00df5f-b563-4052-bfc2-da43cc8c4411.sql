-- Add restrictive policies to prevent UPDATE and DELETE on matches
-- Matches should be immutable once created

CREATE POLICY "Users cannot update matches"
ON public.matches
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "Users cannot delete matches"
ON public.matches
FOR DELETE
USING (false);