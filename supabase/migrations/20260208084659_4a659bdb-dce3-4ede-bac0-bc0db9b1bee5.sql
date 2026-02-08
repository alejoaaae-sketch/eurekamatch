
-- 1. Admin role system (secure, no privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- user_roles RLS
CREATE POLICY "Authenticated can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Block anon on user_roles" ON public.user_roles
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- 2. app_config table (per mode)
CREATE TABLE public.app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_mode text NOT NULL UNIQUE CHECK (app_mode IN ('love', 'friends', 'sex')),
  max_picks integer NOT NULL DEFAULT 2,
  free_changes_per_month integer NOT NULL DEFAULT 0,
  price_per_change numeric(10,2) NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read app_config" ON public.app_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can modify app_config" ON public.app_config
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Block anon on app_config" ON public.app_config
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default data
INSERT INTO public.app_config (app_mode, max_picks, free_changes_per_month, price_per_change, enabled) VALUES
  ('love', 2, 0, 0.99, true),
  ('friends', 5, 0, 0.99, true),
  ('sex', 2, 0, 0.99, false);

-- 3. global_config table (singleton)
CREATE TABLE public.global_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_new_users_per_day integer NOT NULL DEFAULT 0,
  enabled_languages text[] NOT NULL DEFAULT '{es,eu,en}',
  enabled_countries text[] NOT NULL DEFAULT '{ES}',
  promo_enabled boolean NOT NULL DEFAULT false,
  promo_start timestamptz,
  promo_end timestamptz,
  promo_max_picks_override integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.global_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read global_config" ON public.global_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can modify global_config" ON public.global_config
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Block anon on global_config" ON public.global_config
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE TRIGGER update_global_config_updated_at
  BEFORE UPDATE ON public.global_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton row
INSERT INTO public.global_config (max_new_users_per_day, enabled_languages, enabled_countries) VALUES
  (0, '{es,eu,en,ca,fr,ja}', '{ES}');

-- 4. user_usage table (monthly tracking per user)
CREATE TABLE public.user_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_mode text NOT NULL CHECK (app_mode IN ('love', 'friends', 'sex')),
  month text NOT NULL, -- YYYY-MM format
  free_changes_used integer NOT NULL DEFAULT 0,
  paid_changes_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, app_mode, month)
);
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage" ON public.user_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own usage" ON public.user_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON public.user_usage
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Block anon on user_usage" ON public.user_usage
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block delete on user_usage" ON public.user_usage
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER update_user_usage_updated_at
  BEFORE UPDATE ON public.user_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_usage_lookup ON public.user_usage (user_id, app_mode, month);

-- 5. Enforce max_new_users_per_day on profile creation
CREATE OR REPLACE FUNCTION public.enforce_max_new_users_per_day()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_today_count integer;
BEGIN
  SELECT max_new_users_per_day INTO v_limit FROM public.global_config LIMIT 1;
  
  -- 0 means no limit
  IF v_limit IS NULL OR v_limit = 0 THEN
    RETURN NEW;
  END IF;
  
  SELECT COUNT(*) INTO v_today_count
  FROM public.profiles
  WHERE created_at::date = CURRENT_DATE;
  
  IF v_today_count >= v_limit THEN
    RAISE EXCEPTION 'Daily new user limit reached. Please try again tomorrow.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_max_new_users
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_new_users_per_day();

-- 6. Update check_pick_limit to use dynamic config + promo
CREATE OR REPLACE FUNCTION public.check_pick_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  v_max_picks INTEGER;
  v_promo_override INTEGER;
  v_promo_enabled BOOLEAN;
  v_promo_start TIMESTAMPTZ;
  v_promo_end TIMESTAMPTZ;
  v_app_mode TEXT;
BEGIN
  -- Map app_type to app_mode (plan -> friends)
  v_app_mode := CASE WHEN NEW.app_type = 'plan' THEN 'friends' ELSE NEW.app_type END;

  -- Get dynamic max_picks from app_config
  SELECT max_picks INTO v_max_picks
  FROM public.app_config
  WHERE app_mode = v_app_mode;

  -- Fallback defaults
  IF v_max_picks IS NULL THEN
    CASE NEW.app_type
      WHEN 'love' THEN v_max_picks := 2;
      WHEN 'plan' THEN v_max_picks := 5;
      WHEN 'sex' THEN v_max_picks := 2;
      ELSE v_max_picks := 2;
    END CASE;
  END IF;

  -- Check promo override
  SELECT promo_enabled, promo_start, promo_end, promo_max_picks_override
  INTO v_promo_enabled, v_promo_start, v_promo_end, v_promo_override
  FROM public.global_config LIMIT 1;

  IF v_promo_enabled = true
     AND v_promo_start IS NOT NULL AND v_promo_end IS NOT NULL
     AND now() BETWEEN v_promo_start AND v_promo_end
     AND v_promo_override IS NOT NULL THEN
    v_max_picks := v_promo_override;
  END IF;
  
  -- Count only ACTIVE unmatched picks (exclude soft-deleted and matched)
  SELECT COUNT(*) INTO current_count
  FROM public.picks
  WHERE picker_id = NEW.picker_id
    AND app_type = NEW.app_type
    AND deleted_at IS NULL
    AND is_matched = false;
  
  IF current_count >= v_max_picks THEN
    RAISE EXCEPTION 'Pick limit reached for this app. Maximum % picks allowed.', v_max_picks;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Helper function to get effective max_picks (for frontend)
CREATE OR REPLACE FUNCTION public.get_effective_max_picks(p_app_mode text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_picks INTEGER;
  v_promo_enabled BOOLEAN;
  v_promo_start TIMESTAMPTZ;
  v_promo_end TIMESTAMPTZ;
  v_promo_override INTEGER;
BEGIN
  SELECT max_picks INTO v_max_picks
  FROM public.app_config WHERE app_mode = p_app_mode;

  IF v_max_picks IS NULL THEN v_max_picks := 2; END IF;

  SELECT promo_enabled, promo_start, promo_end, promo_max_picks_override
  INTO v_promo_enabled, v_promo_start, v_promo_end, v_promo_override
  FROM public.global_config LIMIT 1;

  IF v_promo_enabled = true
     AND v_promo_start IS NOT NULL AND v_promo_end IS NOT NULL
     AND now() BETWEEN v_promo_start AND v_promo_end
     AND v_promo_override IS NOT NULL THEN
    v_max_picks := v_promo_override;
  END IF;

  RETURN v_max_picks;
END;
$$;
