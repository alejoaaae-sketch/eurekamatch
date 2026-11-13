CREATE OR REPLACE FUNCTION public.charge_pick_replacement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_beta boolean; v_count integer; v_max integer;
BEGIN
 IF auth.uid() IS NOT NULL AND auth.uid()<>NEW.picker_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.picker_id::text,0));
 SELECT beta_mode INTO v_beta FROM public.global_config LIMIT 1;
 IF COALESCE(v_beta,false) THEN RETURN NEW; END IF;
 SELECT count(*) INTO v_count FROM public.picks WHERE picker_id=NEW.picker_id AND app_type=NEW.app_type;
 v_max := public.get_effective_max_picks(NEW.app_type);
 IF v_count >= v_max THEN
  UPDATE public.user_pick_balance SET picks_remaining=picks_remaining-1,total_used=total_used+1
  WHERE user_id=NEW.picker_id AND picks_remaining>0;
  IF NOT FOUND THEN RAISE EXCEPTION 'No picks remaining'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER charge_pick_replacement_trigger BEFORE INSERT ON public.picks FOR EACH ROW EXECUTE FUNCTION public.charge_pick_replacement();