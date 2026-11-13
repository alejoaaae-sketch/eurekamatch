CREATE OR REPLACE FUNCTION public.get_own_match_pick(p_match_id uuid)
RETURNS TABLE(picked_name text, app_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT p.picked_name,p.app_type
 FROM public.matches m
 JOIN public.picks p ON p.id = CASE WHEN m.user1_id=auth.uid() THEN m.pick1_id ELSE m.pick2_id END
 WHERE m.id=p_match_id AND auth.uid() IN (m.user1_id,m.user2_id)
 AND p.picker_id=auth.uid() AND NOT public.has_block_between(m.user1_id,m.user2_id)
$$;
REVOKE ALL ON FUNCTION public.get_own_match_pick(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_match_pick(uuid) TO authenticated, service_role;