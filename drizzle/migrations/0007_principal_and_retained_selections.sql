ALTER TABLE public.picks ADD COLUMN selection_kind text NOT NULL DEFAULT 'principal' CHECK(selection_kind IN ('principal','conserved'));
ALTER TABLE public.picks ADD COLUMN expires_at timestamptz;
ALTER TABLE public.picks ADD COLUMN replaced_pick_id uuid;
ALTER TABLE public.picks ADD COLUMN keep_previous boolean NOT NULL DEFAULT false;
UPDATE public.picks SET expires_at=created_at + interval '90 days' WHERE app_type='love';
COMMENT ON COLUMN public.picks.expires_at IS 'Love selections expire 90 days after insertion; conserving never extends this timestamp. Expired rows remain only for history.';
CREATE INDEX picks_active_selection_idx ON public.picks(picker_id,app_type,selection_kind,expires_at) WHERE deleted_at IS NULL AND is_matched=false;
CREATE OR REPLACE FUNCTION public.enforce_pick_soft_delete_only() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-'deleted_at') IS DISTINCT FROM (to_jsonb(OLD)-'deleted_at') THEN RAISE EXCEPTION 'Only deletion is allowed'; END IF;
 IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN RAISE EXCEPTION 'Deleted selections cannot be restored'; END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.charge_pick_replacement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_beta boolean; v_count integer; v_max integer; v_cost integer; v_old public.picks%ROWTYPE;
BEGIN
 IF auth.uid() IS NOT NULL AND auth.uid()<>NEW.picker_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.picker_id::text,0));
 IF NEW.app_type='love' THEN
  NEW.selection_kind:='principal'; NEW.created_at:=now(); NEW.expires_at:=now()+interval '90 days'; NEW.is_matched:=false; NEW.picked_user_id:=NULL; NEW.deleted_at:=NULL;
  IF NEW.replaced_pick_id IS NOT NULL THEN
   SELECT * INTO v_old FROM public.picks WHERE id=NEW.replaced_pick_id AND picker_id=NEW.picker_id AND app_type='love' AND selection_kind='principal' AND deleted_at IS NULL AND is_matched=false AND expires_at>now() FOR UPDATE;
   IF v_old.id IS NULL THEN RAISE EXCEPTION 'La elección principal ya no está disponible'; END IF;
   IF NEW.keep_previous THEN
    SELECT count(*) INTO v_count FROM public.picks WHERE picker_id=NEW.picker_id AND app_type='love' AND selection_kind='conserved' AND deleted_at IS NULL AND is_matched=false AND expires_at>now();
    IF v_count>=5 THEN RAISE EXCEPTION 'Ya tienes 5 elecciones conservadas'; END IF;
    v_cost:=3;
   ELSE v_cost:=1; END IF;
  ELSE
   IF NEW.keep_previous THEN RAISE EXCEPTION 'Debes seleccionar qué elección sustituir'; END IF;
   SELECT count(*) INTO v_count FROM public.picks WHERE picker_id=NEW.picker_id AND app_type='love';
   v_cost:=CASE WHEN v_count<2 THEN 0 ELSE 1 END;
  END IF;
  IF v_cost>0 THEN
   UPDATE public.user_pick_balance SET picks_remaining=picks_remaining-v_cost,total_used=total_used+v_cost WHERE user_id=NEW.picker_id AND picks_remaining>=v_cost;
   IF NOT FOUND THEN RAISE EXCEPTION 'No tienes suficientes créditos'; END IF;
  END IF;
  IF v_old.id IS NOT NULL THEN
   IF NEW.keep_previous THEN UPDATE public.picks SET selection_kind='conserved' WHERE id=v_old.id;
   ELSE UPDATE public.picks SET deleted_at=now() WHERE id=v_old.id; END IF;
  END IF;
 ELSE
  IF NEW.selection_kind<>'principal' OR NEW.replaced_pick_id IS NOT NULL OR NEW.keep_previous OR NEW.expires_at IS NOT NULL THEN RAISE EXCEPTION 'Unsupported selection options'; END IF;
  SELECT beta_mode INTO v_beta FROM public.global_config LIMIT 1;
  IF COALESCE(v_beta,false) THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_count FROM public.picks WHERE picker_id=NEW.picker_id AND app_type=NEW.app_type;
  v_max:=public.get_effective_max_picks(NEW.app_type);
  IF v_count>=v_max THEN
   UPDATE public.user_pick_balance SET picks_remaining=picks_remaining-1,total_used=total_used+1 WHERE user_id=NEW.picker_id AND picks_remaining>0;
   IF NOT FOUND THEN RAISE EXCEPTION 'No picks remaining'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.check_pick_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer; v_max integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.picker_id::text,0));
 v_max:=CASE WHEN NEW.app_type='love' THEN 2 ELSE public.get_effective_max_picks(NEW.app_type) END;
 SELECT count(*) INTO v_count FROM public.picks WHERE picker_id=NEW.picker_id AND app_type=NEW.app_type AND deleted_at IS NULL AND is_matched=false AND (app_type<>'love' OR (selection_kind='principal' AND expires_at>now()));
 IF v_count>=v_max THEN RAISE EXCEPTION 'Has alcanzado el límite de % elecciones principales',v_max; END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.check_mutual_match() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.profiles%ROWTYPE; b public.profiles%ROWTYPE; r public.picks%ROWTYPE;
BEGIN
 IF NEW.deleted_at IS NOT NULL OR (NEW.app_type='love' AND (NEW.expires_at IS NULL OR NEW.expires_at<=now())) THEN RETURN NEW; END IF;
 SELECT * INTO a FROM public.profiles WHERE user_id=NEW.picker_id;
 IF NEW.identifier_type='phone' THEN
  SELECT * INTO b FROM public.profiles WHERE normalize_phone(phone)=normalize_phone(NEW.picked_identifier) AND user_id<>NEW.picker_id;
 ELSE
  SELECT * INTO b FROM public.profiles WHERE lower(email)=lower(NEW.picked_identifier) AND email_verified=true AND user_id<>NEW.picker_id;
 END IF;
 IF b.user_id IS NULL THEN RETURN NEW; END IF;
 UPDATE public.picks SET picked_user_id=b.user_id WHERE id=NEW.id;
 IF has_block_between(NEW.picker_id,b.user_id) OR is_app_disabled_for_user(b.user_id,NEW.app_type) OR is_app_disabled_for_user(NEW.picker_id,NEW.app_type) THEN RETURN NEW; END IF;
 SELECT * INTO r FROM public.picks WHERE picker_id=b.user_id AND app_type=NEW.app_type AND is_matched=false AND deleted_at IS NULL AND (app_type<>'love' OR expires_at>now()) AND
 ((identifier_type='phone' AND a.phone IS NOT NULL AND normalize_phone(picked_identifier)=normalize_phone(a.phone)) OR
 (identifier_type='email' AND a.email_verified=true AND a.email IS NOT NULL AND lower(picked_identifier)=lower(a.email))) LIMIT 1 FOR UPDATE;
 IF r.id IS NOT NULL THEN
  INSERT INTO public.matches(user1_id,user2_id,pick1_id,pick2_id) VALUES(NEW.picker_id,b.user_id,NEW.id,r.id) ON CONFLICT DO NOTHING;
  UPDATE public.picks SET is_matched=true WHERE id IN(NEW.id,r.id);
 END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.check_matches_on_profile_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pick_record RECORD; matched_pick public.picks%ROWTYPE;
BEGIN
 IF NEW.phone IS NOT NULL AND (OLD.phone IS NULL OR OLD.phone<>NEW.phone) THEN
  UPDATE public.picks SET picked_user_id=NEW.user_id WHERE normalize_phone(picked_identifier)=normalize_phone(NEW.phone) AND identifier_type='phone' AND picked_user_id IS NULL AND deleted_at IS NULL AND (app_type<>'love' OR expires_at>now());
  FOR pick_record IN SELECT * FROM public.picks WHERE normalize_phone(picked_identifier)=normalize_phone(NEW.phone) AND identifier_type='phone' AND is_matched=false AND deleted_at IS NULL AND (app_type<>'love' OR expires_at>now()) LOOP
   IF has_block_between(pick_record.picker_id,NEW.user_id) OR is_app_disabled_for_user(NEW.user_id,pick_record.app_type) OR is_app_disabled_for_user(pick_record.picker_id,pick_record.app_type) THEN CONTINUE; END IF;
   SELECT p.* INTO matched_pick FROM public.picks p WHERE p.picker_id=NEW.user_id AND p.picked_user_id=pick_record.picker_id AND p.app_type=pick_record.app_type AND p.is_matched=false AND p.deleted_at IS NULL AND (p.app_type<>'love' OR p.expires_at>now())
    AND (p.identifier_type='phone' OR EXISTS(SELECT 1 FROM public.profiles target WHERE target.user_id=pick_record.picker_id AND target.email_verified=true AND lower(target.email)=lower(p.picked_identifier))) LIMIT 1;
   IF matched_pick.id IS NOT NULL THEN
    UPDATE public.picks SET is_matched=true WHERE id IN(pick_record.id,matched_pick.id);
    INSERT INTO public.matches(user1_id,user2_id,pick1_id,pick2_id) VALUES(pick_record.picker_id,NEW.user_id,pick_record.id,matched_pick.id) ON CONFLICT DO NOTHING;
   END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END; $$;