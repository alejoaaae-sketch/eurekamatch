CREATE OR REPLACE FUNCTION public.check_matches_on_profile_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pick_record RECORD; matched_pick public.picks%ROWTYPE;
BEGIN
 IF NEW.phone IS NOT NULL AND (OLD.phone IS NULL OR OLD.phone<>NEW.phone) THEN
  UPDATE public.picks SET picked_user_id=NEW.user_id WHERE picked_identifier=NEW.phone AND identifier_type='phone' AND picked_user_id IS NULL;
  FOR pick_record IN SELECT * FROM public.picks WHERE picked_identifier=NEW.phone AND identifier_type='phone' AND is_matched=false AND deleted_at IS NULL LOOP
   IF has_block_between(pick_record.picker_id,NEW.user_id) THEN CONTINUE; END IF;
   SELECT p.* INTO matched_pick FROM public.picks p WHERE p.picker_id=NEW.user_id AND p.picked_user_id=pick_record.picker_id AND p.app_type=pick_record.app_type AND p.is_matched=false AND p.deleted_at IS NULL
    AND (p.identifier_type='phone' OR EXISTS(SELECT 1 FROM public.profiles target WHERE target.user_id=pick_record.picker_id AND target.email_verified=true AND lower(target.email)=lower(p.picked_identifier))) LIMIT 1;
   IF matched_pick.id IS NOT NULL THEN
    UPDATE public.picks SET is_matched=true WHERE id IN(pick_record.id,matched_pick.id);
    IF pick_record.picker_id<NEW.user_id THEN
     INSERT INTO public.matches(user1_id,user2_id,pick1_id,pick2_id) VALUES(pick_record.picker_id,NEW.user_id,pick_record.id,matched_pick.id) ON CONFLICT DO NOTHING;
    ELSE
     INSERT INTO public.matches(user1_id,user2_id,pick1_id,pick2_id) VALUES(NEW.user_id,pick_record.picker_id,matched_pick.id,pick_record.id) ON CONFLICT DO NOTHING;
    END IF;
   END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END; $$;