CREATE OR REPLACE FUNCTION public.can_read_own_match(user_a uuid, user_b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT COALESCE(auth.uid() IN (user_a,user_b),false) AND NOT public.has_block_between(user_a,user_b) $$;
REVOKE ALL ON FUNCTION public.can_read_own_match(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_own_match(uuid,uuid) TO authenticated,service_role;
ALTER POLICY "Users can view their own matches_safe" ON public.matches_safe USING (public.can_read_own_match(user1_id,user2_id));