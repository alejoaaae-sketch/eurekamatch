
-- Update grant_referral_credit to also record in pack_purchases for history tracking
CREATE OR REPLACE FUNCTION public.grant_referral_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.referred_by IS NOT NULL OR NEW.referred_by IS NULL OR NEW.referred_by = '' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.referred_by IS NULL OR NEW.referred_by = '' THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT user_id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = UPPER(NEW.referred_by)
    AND user_id != NEW.user_id;

  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Grant 1 credit to the referrer
  UPDATE public.user_pick_balance
  SET picks_remaining = picks_remaining + 1, total_purchased = total_purchased + 1
  WHERE user_id = v_referrer_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_pick_balance (user_id, picks_remaining, total_purchased, total_used)
    VALUES (v_referrer_id, 1, 1, 0);
  END IF;

  -- Record referrer purchase for history
  INSERT INTO public.pack_purchases (user_id, pack_name, picks_count, price, payment_method)
  VALUES (v_referrer_id, 'Referral bonus', 1, 0, 'referral');

  -- Grant 1 credit to the referred user
  UPDATE public.user_pick_balance
  SET picks_remaining = picks_remaining + 1, total_purchased = total_purchased + 1
  WHERE user_id = NEW.user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_pick_balance (user_id, picks_remaining, total_purchased, total_used)
    VALUES (NEW.user_id, 1, 1, 0);
  END IF;

  -- Record referred user purchase for history
  INSERT INTO public.pack_purchases (user_id, pack_name, picks_count, price, payment_method)
  VALUES (NEW.user_id, 'Welcome referral bonus', 1, 0, 'referral');

  RETURN NEW;
END;
$$;
