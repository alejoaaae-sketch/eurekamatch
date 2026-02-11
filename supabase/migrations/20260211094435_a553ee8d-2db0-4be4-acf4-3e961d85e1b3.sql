
-- Create blocked_users table
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own blocks"
ON public.blocked_users FOR SELECT
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
ON public.blocked_users FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can remove their own blocks"
ON public.blocked_users FOR DELETE
USING (auth.uid() = blocker_id);

-- Block anonymous access
CREATE POLICY "Block anon on blocked_users"
ON public.blocked_users FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block updates (only insert/delete allowed)
CREATE POLICY "Block updates on blocked_users"
ON public.blocked_users FOR UPDATE
USING (false)
WITH CHECK (false);

-- Add blocked column to matches_safe so we can hide blocked matches
ALTER TABLE public.matches_safe ADD COLUMN blocked boolean NOT NULL DEFAULT false;

-- Create function to check if two users have a block between them
CREATE OR REPLACE FUNCTION public.has_block_between(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  )
$$;

-- Update check_mutual_match to check for blocks before creating match
CREATE OR REPLACE FUNCTION public.check_mutual_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

    -- Check if blocked
    IF has_block_between(NEW.picker_id, v_picked_user_profile.user_id) THEN
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

-- Update check_matches_on_profile_update to check for blocks
CREATE OR REPLACE FUNCTION public.check_matches_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  pick_record RECORD;
  matched_pick public.picks%ROWTYPE;
BEGIN
  IF NEW.phone IS NOT NULL AND (OLD.phone IS NULL OR OLD.phone != NEW.phone) THEN
    UPDATE public.picks SET picked_user_id = NEW.user_id
    WHERE picked_identifier = NEW.phone AND identifier_type = 'phone' AND picked_user_id IS NULL;
    
    FOR pick_record IN 
      SELECT * FROM public.picks 
      WHERE picked_identifier = NEW.phone AND identifier_type = 'phone'
        AND is_matched = false AND deleted_at IS NULL
    LOOP
      -- Check if blocked
      IF has_block_between(pick_record.picker_id, NEW.user_id) THEN
        CONTINUE;
      END IF;

      SELECT * INTO matched_pick FROM public.picks
      WHERE picker_id = NEW.user_id AND picked_user_id = pick_record.picker_id
        AND app_type = pick_record.app_type AND is_matched = false AND deleted_at IS NULL;
      
      IF matched_pick.id IS NOT NULL THEN
        UPDATE public.picks SET is_matched = true WHERE id = pick_record.id OR id = matched_pick.id;
        IF pick_record.picker_id < NEW.user_id THEN
          INSERT INTO public.matches (user1_id, user2_id, pick1_id, pick2_id)
          VALUES (pick_record.picker_id, NEW.user_id, pick_record.id, matched_pick.id)
          ON CONFLICT DO NOTHING;
        ELSE
          INSERT INTO public.matches (user1_id, user2_id, pick1_id, pick2_id)
          VALUES (NEW.user_id, pick_record.picker_id, matched_pick.id, pick_record.id)
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update sync trigger to include blocked column
CREATE OR REPLACE FUNCTION public.sync_matches_safe_from_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.matches_safe (id, user1_id, user2_id, created_at, blocked)
  VALUES (NEW.id, NEW.user1_id, NEW.user2_id, NEW.created_at, false)
  ON CONFLICT (id) DO UPDATE
    SET user1_id = EXCLUDED.user1_id,
        user2_id = EXCLUDED.user2_id,
        created_at = EXCLUDED.created_at;
  RETURN NEW;
END;
$function$;

-- Add age_verified column to profiles for sex app
ALTER TABLE public.profiles ADD COLUMN age_verified boolean NOT NULL DEFAULT false;
