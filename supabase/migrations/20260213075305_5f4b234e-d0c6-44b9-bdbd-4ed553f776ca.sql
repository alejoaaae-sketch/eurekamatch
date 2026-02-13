-- Disable user triggers on picks
ALTER TABLE public.picks DISABLE TRIGGER USER;

-- Drop constraints (they may or may not exist after partial migrations)
ALTER TABLE public.app_config DROP CONSTRAINT IF EXISTS app_config_app_mode_check;
ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_app_type_check;

-- Update all data
UPDATE public.app_config SET app_mode = 'mude' WHERE app_mode = 'sex';
UPDATE public.picks SET app_type = 'mude' WHERE app_type = 'sex';
UPDATE public.user_usage SET app_mode = 'mude' WHERE app_mode = 'sex';

-- Re-enable user triggers
ALTER TABLE public.picks ENABLE TRIGGER USER;

-- Add updated constraints (app_config uses 'friends' not 'plan')
ALTER TABLE public.app_config ADD CONSTRAINT app_config_app_mode_check CHECK (app_mode IN ('love', 'friends', 'mude'));
ALTER TABLE public.picks ADD CONSTRAINT picks_app_type_check CHECK (app_type IN ('love', 'plan', 'mude'));

-- Update check_pick_limit function
CREATE OR REPLACE FUNCTION public.check_pick_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  v_max_picks INTEGER;
  v_promo_override INTEGER;
  v_promo_enabled BOOLEAN;
  v_promo_start TIMESTAMPTZ;
  v_promo_end TIMESTAMPTZ;
  v_app_mode TEXT;
BEGIN
  v_app_mode := CASE WHEN NEW.app_type = 'plan' THEN 'friends' ELSE NEW.app_type END;

  SELECT max_picks INTO v_max_picks
  FROM public.app_config
  WHERE app_mode = v_app_mode;

  IF v_max_picks IS NULL THEN
    CASE NEW.app_type
      WHEN 'love' THEN v_max_picks := 2;
      WHEN 'plan' THEN v_max_picks := 5;
      WHEN 'mude' THEN v_max_picks := 2;
      ELSE v_max_picks := 2;
    END CASE;
  END IF;

  SELECT promo_enabled, promo_start, promo_end, promo_max_picks_override
  INTO v_promo_enabled, v_promo_start, v_promo_end, v_promo_override
  FROM public.global_config LIMIT 1;

  IF v_promo_enabled = true
     AND v_promo_start IS NOT NULL AND v_promo_end IS NOT NULL
     AND now() BETWEEN v_promo_start AND v_promo_end
     AND v_promo_override IS NOT NULL THEN
    v_max_picks := v_promo_override;
  END IF;
  
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
$function$;