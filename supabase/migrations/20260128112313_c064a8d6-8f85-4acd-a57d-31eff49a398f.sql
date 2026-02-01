-- Block direct INSERT to matches table
-- Matches should only be created by the check_mutual_match trigger (SECURITY DEFINER)
CREATE POLICY "Users cannot insert matches directly" 
ON public.matches 
FOR INSERT 
WITH CHECK (false);