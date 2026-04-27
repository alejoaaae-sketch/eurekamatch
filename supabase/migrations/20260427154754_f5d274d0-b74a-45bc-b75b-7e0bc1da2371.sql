
-- Temporarily disable trigger that prevents app_type updates on picks
ALTER TABLE public.picks DISABLE TRIGGER USER;

-- Drop CHECK constraints
ALTER TABLE public.app_config DROP CONSTRAINT IF EXISTS app_config_app_mode_check;
ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_app_type_check;
ALTER TABLE public.user_disabled_apps DROP CONSTRAINT IF EXISTS user_disabled_apps_app_mode_check;
ALTER TABLE public.user_usage DROP CONSTRAINT IF EXISTS user_usage_app_mode_check;

-- Update data
UPDATE public.picks SET app_type = 'friends' WHERE app_type = 'plan';
UPDATE public.picks SET app_type = 'sex' WHERE app_type = 'mude';
UPDATE public.picks SET app_type = 'hobby' WHERE app_type = 'sport';

UPDATE public.user_sessions SET app_type = 'friends' WHERE app_type = 'plan';
UPDATE public.user_sessions SET app_type = 'sex' WHERE app_type = 'mude';
UPDATE public.user_sessions SET app_type = 'hobby' WHERE app_type = 'sport';

UPDATE public.app_config SET app_mode = 'sex' WHERE app_mode = 'mude';
UPDATE public.app_config SET app_mode = 'hobby' WHERE app_mode = 'sport';

UPDATE public.user_disabled_apps SET app_mode = 'sex' WHERE app_mode = 'mude';
UPDATE public.user_disabled_apps SET app_mode = 'hobby' WHERE app_mode = 'sport';

UPDATE public.user_usage SET app_mode = 'sex' WHERE app_mode = 'mude';
UPDATE public.user_usage SET app_mode = 'hobby' WHERE app_mode = 'sport';

-- Re-enable triggers
ALTER TABLE public.picks ENABLE TRIGGER USER;

-- Re-create CHECK constraints with new allowed values
ALTER TABLE public.app_config
  ADD CONSTRAINT app_config_app_mode_check
  CHECK (app_mode = ANY (ARRAY['love'::text, 'friends'::text, 'sex'::text, 'hobby'::text]));

ALTER TABLE public.picks
  ADD CONSTRAINT picks_app_type_check
  CHECK (app_type = ANY (ARRAY['love'::text, 'friends'::text, 'sex'::text, 'hobby'::text]));

ALTER TABLE public.user_disabled_apps
  ADD CONSTRAINT user_disabled_apps_app_mode_check
  CHECK (app_mode = ANY (ARRAY['love'::text, 'friends'::text, 'sex'::text, 'hobby'::text]));

ALTER TABLE public.user_usage
  ADD CONSTRAINT user_usage_app_mode_check
  CHECK (app_mode = ANY (ARRAY['love'::text, 'friends'::text, 'sex'::text, 'hobby'::text]));

-- Update internal functions: remove plan->friends mapping
CREATE OR REPLACE FUNCTION public.check_mutual_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_user_profile profiles%ROWTYPE;
  v_picked_user_profile profiles%ROWTYPE;
  v_reverse_pick picks%ROWTYPE;
  v_new_match_id uuid;
  v_normalized_picked_identifier text;
BEGIN
  SELECT * INTO v_current_user_profile FROM profiles WHERE user_id = NEW.picker_id;
  v_normalized_picked_identifier := normalize_phone(NEW.picked_identifier);

  IF NEW.identifier_type = 'phone' THEN
    SELECT * INTO v_picked_user_profile FROM profiles
    WHERE normalize_phone(phone) = v_normalized_picked_identifier AND user_id != NEW.picker_id;
  ELSIF NEW.identifier_type = 'email' THEN
    SELECT * INTO v_picked_user_profile FROM profiles
    WHERE LOWER(email) = LOWER(NEW.picked_identifier) AND user_id != NEW.picker_id;
  END IF;

  IF v_picked_user_profile.user_id IS NOT NULL THEN
    UPDATE picks SET picked_user_id = v_picked_user_profile.user_id WHERE id = NEW.id;

    IF has_block_between(NEW.picker_id, v_picked_user_profile.user_id) THEN
      RETURN NEW;
    END IF;

    IF is_app_disabled_for_user(v_picked_user_profile.user_id, NEW.app_type) THEN
      RETURN NEW;
    END IF;

    IF is_app_disabled_for_user(NEW.picker_id, NEW.app_type) THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_reverse_pick FROM picks
    WHERE picker_id = v_picked_user_profile.user_id
      AND app_type = NEW.app_type
      AND is_matched = false
      AND deleted_at IS NULL
      AND (
        (identifier_type = 'phone' AND v_current_user_profile.phone IS NOT NULL 
          AND normalize_phone(picked_identifier) = normalize_phone(v_current_user_profile.phone))
        OR
        (identifier_type = 'email' AND v_current_user_profile.email IS NOT NULL 
          AND LOWER(picked_identifier) = LOWER(v_current_user_profile.email))
      );

    IF v_reverse_pick.id IS NOT NULL THEN
      v_new_match_id := gen_random_uuid();
      INSERT INTO matches (id, user1_id, user2_id, pick1_id, pick2_id)
      VALUES (v_new_match_id, NEW.picker_id, v_picked_user_profile.user_id, NEW.id, v_reverse_pick.id);
      UPDATE picks SET is_matched = true WHERE id = NEW.id;
      UPDATE picks SET is_matched = true WHERE id = v_reverse_pick.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

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
BEGIN
  SELECT max_picks INTO v_max_picks
  FROM public.app_config
  WHERE app_mode = NEW.app_type;

  IF v_max_picks IS NULL THEN
    CASE NEW.app_type
      WHEN 'love' THEN v_max_picks := 2;
      WHEN 'friends' THEN v_max_picks := 5;
      WHEN 'sex' THEN v_max_picks := 2;
      WHEN 'hobby' THEN v_max_picks := 5;
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
