CREATE TABLE public.match_notification_authorizations (
  match_id uuid PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  used_at timestamptz
);
GRANT ALL ON public.match_notification_authorizations TO service_role;
ALTER TABLE public.match_notification_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.match_notification_authorizations FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.notify_match_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_app_type text; v_token text;
BEGIN
 SELECT app_type INTO v_app_type FROM public.picks WHERE id=NEW.pick1_id;
 INSERT INTO public.match_notification_authorizations(match_id) VALUES(NEW.id) RETURNING token INTO v_token;
 BEGIN
  PERFORM net.http_post(
   url := 'https://mnfseybrfzexacyzjqwh.supabase.co/functions/v1/send-match-notification',
   body := jsonb_build_object('matchId',NEW.id,'user1Id',NEW.user1_id,'user2Id',NEW.user2_id,'appType',COALESCE(v_app_type,'love')),
   headers := jsonb_build_object('Content-Type','application/json','x-match-notification-token',v_token));
 EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Match notification delivery failed';
 END;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.get_matched_user_profile(p_match_id uuid)
RETURNS TABLE(email text, phone text, display_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.matches m WHERE m.id=p_match_id
  AND auth.uid() IN(m.user1_id,m.user2_id)
  AND NOT public.has_block_between(m.user1_id,m.user2_id)) THEN
  RAISE EXCEPTION 'Unauthorized';
 END IF;
 RETURN QUERY SELECT CASE WHEN p.email_verified THEN p.email ELSE NULL END, p.phone,p.display_name
 FROM public.matches m JOIN public.profiles p ON p.user_id=CASE WHEN m.user1_id=auth.uid() THEN m.user2_id ELSE m.user1_id END
 WHERE m.id=p_match_id;
END; $$;
ALTER POLICY "Users can view their own matches_safe" ON public.matches_safe
USING ((auth.uid()=user1_id OR auth.uid()=user2_id) AND NOT public.has_block_between(user1_id,user2_id));
ALTER POLICY "Anyone can read enabled packs" ON public.pick_packs TO anon, authenticated USING(enabled = true);
CREATE OR REPLACE FUNCTION public.reset_email_verification_on_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.email IS DISTINCT FROM OLD.email THEN NEW.email_verified := false; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER zz_reset_email_verification_on_change BEFORE UPDATE OF email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.reset_email_verification_on_change();
CREATE OR REPLACE FUNCTION public.check_mutual_match() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.profiles%ROWTYPE; b public.profiles%ROWTYPE; r public.picks%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.profiles WHERE user_id=NEW.picker_id;
 IF NEW.identifier_type='phone' THEN
  SELECT * INTO b FROM public.profiles WHERE normalize_phone(phone)=normalize_phone(NEW.picked_identifier) AND user_id<>NEW.picker_id;
 ELSE
  SELECT * INTO b FROM public.profiles WHERE lower(email)=lower(NEW.picked_identifier) AND email_verified=true AND user_id<>NEW.picker_id;
 END IF;
 IF b.user_id IS NULL THEN RETURN NEW; END IF;
 UPDATE public.picks SET picked_user_id=b.user_id WHERE id=NEW.id;
 IF has_block_between(NEW.picker_id,b.user_id) OR is_app_disabled_for_user(b.user_id,NEW.app_type) OR is_app_disabled_for_user(NEW.picker_id,NEW.app_type) THEN RETURN NEW; END IF;
 SELECT * INTO r FROM public.picks WHERE picker_id=b.user_id AND app_type=NEW.app_type AND is_matched=false AND deleted_at IS NULL AND
 ((identifier_type='phone' AND a.phone IS NOT NULL AND normalize_phone(picked_identifier)=normalize_phone(a.phone)) OR
 (identifier_type='email' AND a.email_verified=true AND a.email IS NOT NULL AND lower(picked_identifier)=lower(a.email))) LIMIT 1;
 IF r.id IS NOT NULL THEN
  INSERT INTO public.matches(user1_id,user2_id,pick1_id,pick2_id) VALUES(NEW.picker_id,b.user_id,NEW.id,r.id);
  UPDATE public.picks SET is_matched=true WHERE id IN(NEW.id,r.id);
 END IF;
 RETURN NEW;
END; $$;