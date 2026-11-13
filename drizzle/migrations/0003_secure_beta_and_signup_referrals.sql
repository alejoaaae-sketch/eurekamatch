CREATE OR REPLACE FUNCTION public.complete_beta_purchase(p_pack_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid := auth.uid(); v_beta boolean; v_pack public.pick_packs%ROWTYPE;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF NOT public.has_role(v_user, 'admin'::public.app_role) THEN RAISE EXCEPTION 'Administrator required'; END IF;
 SELECT beta_mode INTO v_beta FROM public.global_config LIMIT 1;
 IF NOT COALESCE(v_beta,false) THEN RAISE EXCEPTION 'Beta mode is not enabled'; END IF;
 SELECT * INTO v_pack FROM public.pick_packs WHERE id=p_pack_id AND enabled=true;
 IF v_pack.id IS NULL THEN RAISE EXCEPTION 'Invalid or disabled pack'; END IF;
 INSERT INTO public.pack_purchases(user_id,pack_id,pack_name,picks_count,price,payment_method)
 VALUES(v_user,v_pack.id,v_pack.name,v_pack.picks_count,v_pack.price,'beta_simulation');
 INSERT INTO public.user_pick_balance(user_id,picks_remaining,total_purchased,total_used)
 VALUES(v_user,v_pack.picks_count,v_pack.picks_count,0)
 ON CONFLICT(user_id) DO UPDATE SET picks_remaining=public.user_pick_balance.picks_remaining+EXCLUDED.picks_remaining,total_purchased=public.user_pick_balance.total_purchased+EXCLUDED.total_purchased;
 RETURN jsonb_build_object('success',true,'picks_added',v_pack.picks_count);
END; $$;
REVOKE ALL ON FUNCTION public.complete_beta_purchase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_beta_purchase(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.guard_signup_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN RAISE EXCEPTION 'Referral attribution cannot be changed'; END IF;
 ELSIF NEW.referred_by IS NOT NULL THEN
  -- Only a nested Auth lifecycle insert may supply attribution, never a direct profile insert.
  IF pg_trigger_depth()<2 THEN RAISE EXCEPTION 'Referral attribution requires signup'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER profiles_guard_signup_referral BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_signup_referral();
REVOKE ALL ON FUNCTION public.guard_signup_referral() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_phone text; v_referral text;
BEGIN
 v_referral := upper(NEW.raw_user_meta_data->>'referral_code');
 IF v_referral IS NULL OR v_referral !~ '^[A-Z0-9]{8}$' OR
 NOT EXISTS(SELECT 1 FROM public.global_config WHERE referral_enabled=true) OR
 NOT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code=v_referral AND user_id<>NEW.id) THEN
  v_referral := NULL;
 END IF;
 INSERT INTO public.profiles(user_id,email,referred_by) VALUES(NEW.id,NEW.email,v_referral);
 UPDATE public.picks SET picked_user_id=NEW.id WHERE picked_identifier=NEW.email AND identifier_type='email' AND picked_user_id IS NULL;
 IF NEW.email LIKE '%@phone.eureka' THEN
  v_phone := split_part(NEW.email,'-',1);
  IF v_phone IS NOT NULL AND v_phone<>'' THEN
   UPDATE public.picks SET picked_user_id=NEW.id WHERE identifier_type='phone' AND picked_user_id IS NULL AND public.normalize_phone(picked_identifier)=public.normalize_phone(v_phone);
  END IF;
 END IF;
 RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.grant_referral_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_referrer_id uuid;
BEGIN
 IF TG_OP<>'INSERT' OR pg_trigger_depth()<2 OR NEW.referred_by IS NULL OR NEW.referred_by !~ '^[A-Z0-9]{8}$' THEN RETURN NEW; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.global_config WHERE referral_enabled=true) THEN RETURN NEW; END IF;
 SELECT user_id INTO v_referrer_id FROM public.profiles WHERE referral_code=NEW.referred_by AND user_id<>NEW.user_id;
 IF v_referrer_id IS NULL THEN RETURN NEW; END IF;
 INSERT INTO public.user_pick_balance(user_id,picks_remaining,total_purchased,total_used) VALUES(v_referrer_id,1,1,0)
 ON CONFLICT(user_id) DO UPDATE SET picks_remaining=public.user_pick_balance.picks_remaining+1,total_purchased=public.user_pick_balance.total_purchased+1;
 INSERT INTO public.pack_purchases(user_id,pack_name,picks_count,price,payment_method) VALUES(v_referrer_id,'Referral bonus',1,0,'referral');
 INSERT INTO public.user_pick_balance(user_id,picks_remaining,total_purchased,total_used) VALUES(NEW.user_id,1,1,0)
 ON CONFLICT(user_id) DO UPDATE SET picks_remaining=public.user_pick_balance.picks_remaining+1,total_purchased=public.user_pick_balance.total_purchased+1;
 INSERT INTO public.pack_purchases(user_id,pack_name,picks_count,price,payment_method) VALUES(NEW.user_id,'Welcome referral bonus',1,0,'referral');
 RETURN NEW;
END; $$;
DROP TRIGGER grant_referral_credit_after_signup ON public.profiles;
CREATE TRIGGER grant_referral_credit_after_signup AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.grant_referral_credit();