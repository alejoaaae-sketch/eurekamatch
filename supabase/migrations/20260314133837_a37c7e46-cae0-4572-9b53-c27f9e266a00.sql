
-- Table to store which apps a user has disabled for themselves
CREATE TABLE public.user_disabled_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_mode text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_disabled_apps_app_mode_check CHECK (app_mode IN ('love', 'friends', 'mude', 'sport')),
  UNIQUE (user_id, app_mode)
);

ALTER TABLE public.user_disabled_apps ENABLE ROW LEVEL SECURITY;

-- Block anon
CREATE POLICY "Block anon on user_disabled_apps"
ON public.user_disabled_apps FOR ALL TO anon
USING (false) WITH CHECK (false);

-- Users can read their own
CREATE POLICY "Users can read own disabled apps"
ON public.user_disabled_apps FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own
CREATE POLICY "Users can insert own disabled apps"
ON public.user_disabled_apps FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own (re-enable)
CREATE POLICY "Users can delete own disabled apps"
ON public.user_disabled_apps FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Security definer function to check if a user has disabled an app
CREATE OR REPLACE FUNCTION public.is_app_disabled_for_user(_user_id uuid, _app_mode text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_disabled_apps
    WHERE user_id = _user_id
      AND app_mode = _app_mode
  )
$$;

-- Update check_mutual_match to skip matches when target has disabled that app
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
  v_app_mode_for_check text;
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

    -- Check if blocked
    IF has_block_between(NEW.picker_id, v_picked_user_profile.user_id) THEN
      RETURN NEW;
    END IF;

    -- Map app_type to app_mode for disabled check (plan -> friends)
    v_app_mode_for_check := CASE WHEN NEW.app_type = 'plan' THEN 'friends' ELSE NEW.app_type END;

    -- Check if picked user has disabled this app
    IF is_app_disabled_for_user(v_picked_user_profile.user_id, v_app_mode_for_check) THEN
      RETURN NEW;
    END IF;

    -- Check if picker has disabled this app
    IF is_app_disabled_for_user(NEW.picker_id, v_app_mode_for_check) THEN
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
