-- Deny direct SELECT access to matches table for regular users
-- Only SECURITY DEFINER functions (like get_matched_user_profile) can access it
DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;

CREATE POLICY "No direct access to matches"
ON public.matches
FOR SELECT
USING (false);

-- Revoke direct access privileges
REVOKE SELECT ON public.matches FROM authenticated;
REVOKE ALL ON public.matches FROM anon;
REVOKE ALL ON public.matches FROM PUBLIC;