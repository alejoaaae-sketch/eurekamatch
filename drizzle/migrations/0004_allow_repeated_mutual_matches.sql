ALTER TABLE public.matches DROP CONSTRAINT matches_user1_id_user2_id_key;
CREATE UNIQUE INDEX matches_pick_pair_unique ON public.matches (LEAST(pick1_id, pick2_id), GREATEST(pick1_id, pick2_id));
COMMENT ON INDEX public.matches_pick_pair_unique IS 'Each distinct mutual pick pair may create a match, including repeated matches between the same users; the same picks cannot create duplicate matches.';