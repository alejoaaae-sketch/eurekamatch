-- Drop the restrictive UPDATE policy
DROP POLICY IF EXISTS "Users cannot update picks" ON public.picks;

-- Create a policy that allows the system to update picked_user_id and is_matched
-- but prevents users from updating directly (only via triggers with SECURITY DEFINER)
-- Since triggers with SECURITY DEFINER bypass RLS, we just need to block direct user updates
CREATE POLICY "System can update picks via triggers" 
ON public.picks 
FOR UPDATE 
USING (false)
WITH CHECK (false);