-- Recreate the view explicitly as SECURITY INVOKER (so underlying RLS on public.matches is enforced)
CREATE OR REPLACE VIEW public.matches_safe
WITH (security_invoker=on) AS
  SELECT id, created_at, user1_id, user2_id
  FROM public.matches;

-- Ensure the view is not readable by anonymous users
REVOKE ALL ON public.matches_safe FROM anon;
GRANT SELECT ON public.matches_safe TO authenticated;

-- Defense-in-depth: also prevent anonymous users from selecting from the base table
REVOKE ALL ON public.matches FROM anon;
GRANT SELECT ON public.matches TO authenticated;
