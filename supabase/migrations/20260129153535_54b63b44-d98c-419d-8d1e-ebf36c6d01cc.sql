-- Update check_mutual_match to also verify app_type matches
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
  -- Get the current user's profile
  SELECT * INTO v_current_user_profile
  FROM profiles
  WHERE user_id = NEW.picker_id;

  -- Normalize the picked identifier for comparison
  v_normalized_picked_identifier := normalize_phone(NEW.picked_identifier);

  -- Find if there's a user whose normalized profile matches the normalized picked identifier
  IF NEW.identifier_type = 'phone' THEN
    SELECT * INTO v_picked_user_profile
    FROM profiles
    WHERE normalize_phone(phone) = v_normalized_picked_identifier
      AND user_id != NEW.picker_id;
  ELSIF NEW.identifier_type = 'email' THEN
    SELECT * INTO v_picked_user_profile
    FROM profiles
    WHERE LOWER(email) = LOWER(NEW.picked_identifier)
      AND user_id != NEW.picker_id;
  END IF;

  -- If we found a matching user profile
  IF v_picked_user_profile.user_id IS NOT NULL THEN
    -- Update the pick with the picked_user_id
    UPDATE picks SET picked_user_id = v_picked_user_profile.user_id WHERE id = NEW.id;
    
    -- Check if the picked user has also picked the current user (reverse pick)
    -- IMPORTANT: Also check that app_type matches!
    SELECT * INTO v_reverse_pick
    FROM picks
    WHERE picker_id = v_picked_user_profile.user_id
      AND app_type = NEW.app_type  -- Must be same app!
      AND is_matched = false
      AND deleted_at IS NULL
      AND (
        (identifier_type = 'phone' AND v_current_user_profile.phone IS NOT NULL 
          AND normalize_phone(picked_identifier) = normalize_phone(v_current_user_profile.phone))
        OR
        (identifier_type = 'email' AND v_current_user_profile.email IS NOT NULL 
          AND LOWER(picked_identifier) = LOWER(v_current_user_profile.email))
      );

    -- If mutual pick exists, create a match!
    IF v_reverse_pick.id IS NOT NULL THEN
      v_new_match_id := gen_random_uuid();
      
      -- Insert the match (bypasses RLS because SECURITY DEFINER)
      INSERT INTO matches (id, user1_id, user2_id, pick1_id, pick2_id)
      VALUES (v_new_match_id, NEW.picker_id, v_picked_user_profile.user_id, NEW.id, v_reverse_pick.id);
      
      -- Mark both picks as matched
      UPDATE picks SET is_matched = true WHERE id = NEW.id;
      UPDATE picks SET is_matched = true WHERE id = v_reverse_pick.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update check_matches_on_profile_update to also verify app_type matches
CREATE OR REPLACE FUNCTION public.check_matches_on_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pick_record RECORD;
  matched_pick public.picks%ROWTYPE;
BEGIN
  -- Only proceed if phone was updated and is not null
  IF NEW.phone IS NOT NULL AND (OLD.phone IS NULL OR OLD.phone != NEW.phone) THEN
    -- Update picks that target this phone number
    UPDATE public.picks
    SET picked_user_id = NEW.user_id
    WHERE picked_identifier = NEW.phone
      AND identifier_type = 'phone'
      AND picked_user_id IS NULL;
    
    -- Now check for mutual matches with the updated picks
    FOR pick_record IN 
      SELECT * FROM public.picks 
      WHERE picked_identifier = NEW.phone 
        AND identifier_type = 'phone'
        AND is_matched = false
        AND deleted_at IS NULL
    LOOP
      -- Check if this user also picked the picker
      -- IMPORTANT: Also check that app_type matches!
      SELECT * INTO matched_pick
      FROM public.picks
      WHERE picker_id = NEW.user_id
        AND picked_user_id = pick_record.picker_id
        AND app_type = pick_record.app_type  -- Must be same app!
        AND is_matched = false
        AND deleted_at IS NULL;
      
      IF matched_pick.id IS NOT NULL THEN
        -- We have a mutual match!
        UPDATE public.picks SET is_matched = true WHERE id = pick_record.id OR id = matched_pick.id;
        
        -- Create match record
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