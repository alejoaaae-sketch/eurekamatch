-- Enable RLS on matches_safe view
ALTER VIEW public.matches_safe SET (security_invoker = on);

-- Since it's a view, we need to ensure RLS is enabled
-- The view already has security_invoker=on, so it uses the underlying table's RLS
-- But we should also revoke direct access and only allow through proper policies

-- Revoke all access first
REVOKE ALL ON public.matches_safe FROM anon;
REVOKE ALL ON public.matches_safe FROM authenticated;

-- Grant select only to authenticated users (RLS on base table will filter)
GRANT SELECT ON public.matches_safe TO authenticated;

-- Add comment explaining security model
COMMENT ON VIEW public.matches_safe IS 'Secure view of matches that hides pick IDs. Uses security_invoker=on so RLS policies from the matches table are enforced.';