
-- Add referral_code and referred_by to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by text;

-- Generate referral codes for existing users
UPDATE public.profiles SET referral_code = UPPER(SUBSTRING(md5(random()::text || user_id::text) FROM 1 FOR 8)) WHERE referral_code IS NULL;

-- Function to auto-generate referral code on new profile
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(md5(random()::text || NEW.user_id::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code_on_profile
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Function to grant referrer a credit when referred user signs up
CREATE OR REPLACE FUNCTION public.grant_referral_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  -- Only process if referred_by is set
  IF NEW.referred_by IS NULL OR NEW.referred_by = '' THEN
    RETURN NEW;
  END IF;

  -- Find the referrer by their referral code
  SELECT user_id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = UPPER(NEW.referred_by)
    AND user_id != NEW.user_id;

  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Grant 1 credit to the referrer
  UPDATE public.user_pick_balance
  SET picks_remaining = picks_remaining + 1,
      total_purchased = total_purchased + 1
  WHERE user_id = v_referrer_id;

  -- If no balance row exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_pick_balance (user_id, picks_remaining, total_purchased, total_used)
    VALUES (v_referrer_id, 1, 1, 0);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER grant_referral_credit_after_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_referral_credit();
