-- Add restrictive UPDATE policy to prevent users from manipulating picks
-- The is_matched field should only be updated by database triggers (SECURITY DEFINER)
CREATE POLICY "Users cannot update picks" 
ON public.picks 
FOR UPDATE 
USING (false);