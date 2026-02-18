
-- Table: pick_packs (defines available packs for purchase)
CREATE TABLE public.pick_packs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  picks_count integer NOT NULL,
  price numeric(10,2) NOT NULL,
  price_per_pick numeric(10,2) GENERATED ALWAYS AS (price / picks_count) STORED,
  savings_percent integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pick_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read enabled packs" ON public.pick_packs
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify packs" ON public.pick_packs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block anon writes on pick_packs" ON public.pick_packs
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Block anon update on pick_packs" ON public.pick_packs
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Block anon delete on pick_packs" ON public.pick_packs
  FOR DELETE USING (false);

-- Insert default packs
INSERT INTO public.pick_packs (name, picks_count, price, savings_percent, sort_order) VALUES
  ('basic', 3, 3.00, 0, 1),
  ('small', 7, 5.00, 29, 2),
  ('medium', 15, 10.00, 33, 3),
  ('large', 40, 20.00, 50, 4);

-- Table: user_pick_balance (tracks available picks per user)
CREATE TABLE public.user_pick_balance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  picks_remaining integer NOT NULL DEFAULT 0,
  total_purchased integer NOT NULL DEFAULT 0,
  total_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_pick_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own balance" ON public.user_pick_balance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balance" ON public.user_pick_balance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own balance" ON public.user_pick_balance
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Block delete on user_pick_balance" ON public.user_pick_balance
  FOR DELETE USING (false);

CREATE POLICY "Block anon on user_pick_balance" ON public.user_pick_balance
  FOR ALL USING (false) WITH CHECK (false);

-- Table: pack_purchases (purchase history)
CREATE TABLE public.pack_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  pack_id uuid REFERENCES public.pick_packs(id),
  pack_name text NOT NULL,
  picks_count integer NOT NULL,
  price numeric(10,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'simulation',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pack_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own purchases" ON public.pack_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" ON public.pack_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Block update on pack_purchases" ON public.pack_purchases
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Block delete on pack_purchases" ON public.pack_purchases
  FOR DELETE USING (false);

CREATE POLICY "Block anon on pack_purchases" ON public.pack_purchases
  FOR ALL USING (false) WITH CHECK (false);

-- Add free_picks_on_signup to global_config
ALTER TABLE public.global_config ADD COLUMN free_picks_on_signup integer NOT NULL DEFAULT 3;

-- Trigger: update updated_at on user_pick_balance
CREATE TRIGGER update_user_pick_balance_updated_at
  BEFORE UPDATE ON public.user_pick_balance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update updated_at on pick_packs
CREATE TRIGGER update_pick_packs_updated_at
  BEFORE UPDATE ON public.pick_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function: grant free picks on new user registration
CREATE OR REPLACE FUNCTION public.grant_free_picks_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_free_picks integer;
BEGIN
  SELECT free_picks_on_signup INTO v_free_picks FROM public.global_config LIMIT 1;
  IF v_free_picks IS NULL THEN v_free_picks := 3; END IF;

  INSERT INTO public.user_pick_balance (user_id, picks_remaining, total_purchased, total_used)
  VALUES (NEW.user_id, v_free_picks, v_free_picks, 0);

  RETURN NEW;
END;
$$;

-- Attach trigger to profiles (fires after handle_new_user creates the profile)
CREATE TRIGGER grant_free_picks_after_profile_create
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_free_picks_on_signup();
