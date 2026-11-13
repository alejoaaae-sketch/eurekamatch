CREATE OR REPLACE FUNCTION public.fulfill_stripe_purchase(p_user_id uuid,p_pack_id uuid,p_session_id text,p_amount numeric)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_pack public.pick_packs%ROWTYPE; v_existing public.pack_purchases%ROWTYPE;
BEGIN
 IF p_session_id IS NULL OR p_session_id !~ '^cs_live_[A-Za-z0-9]+$' THEN RAISE EXCEPTION 'Invalid live session'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 SELECT * INTO v_existing FROM public.pack_purchases WHERE payment_method='stripe:'||p_session_id LIMIT 1;
 IF FOUND THEN
  IF v_existing.user_id<>p_user_id THEN RAISE EXCEPTION 'Session ownership mismatch'; END IF;
  RETURN v_existing.picks_count;
 END IF;
 SELECT * INTO v_pack FROM public.pick_packs WHERE id=p_pack_id;
 IF NOT FOUND OR p_amount IS NULL OR v_pack.price<>p_amount THEN RAISE EXCEPTION 'Payment amount mismatch'; END IF;
 INSERT INTO public.pack_purchases(user_id,pack_id,pack_name,picks_count,price,payment_method)
 VALUES(p_user_id,v_pack.id,v_pack.name,v_pack.picks_count,p_amount,'stripe:'||p_session_id);
 INSERT INTO public.user_pick_balance(user_id,picks_remaining,total_purchased,total_used)
 VALUES(p_user_id,v_pack.picks_count,v_pack.picks_count,0)
 ON CONFLICT(user_id) DO UPDATE SET picks_remaining=user_pick_balance.picks_remaining+EXCLUDED.picks_remaining,total_purchased=user_pick_balance.total_purchased+EXCLUDED.total_purchased,updated_at=now();
 RETURN v_pack.picks_count;
END; $$;
REVOKE ALL ON FUNCTION public.fulfill_stripe_purchase(uuid,uuid,text,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_stripe_purchase(uuid,uuid,text,numeric) TO service_role;