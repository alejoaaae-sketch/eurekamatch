-- Create a secure view that hides pick IDs from matches
-- This prevents users from seeing the pick_id of the other user's pick

CREATE VIEW public.matches_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  created_at,
  user1_id,
  user2_id
FROM public.matches;

-- Grant access to the view
GRANT SELECT ON public.matches_safe TO authenticated;

COMMENT ON VIEW public.matches_safe IS 'Secure view of matches that hides pick IDs to prevent information leakage';