-- Create a function to normalize phone numbers (remove spaces, dots, dashes, parentheses)
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF phone_input IS NULL THEN
    RETURN NULL;
  END IF;
  -- Remove spaces, dots, dashes, parentheses, and other common separators
  RETURN regexp_replace(phone_input, '[\s\.\-\(\)]+', '', 'g');
END;
$$;

-- Update the check_mutual_match function to use normalized phone comparison
CREATE OR REPLACE FUNCTION public.check_mutual_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Using normalized phone comparison for phone type
    SELECT * INTO v_reverse_pick
    FROM picks
    WHERE picker_id = v_picked_user_profile.user_id
      AND is_matched = false
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
      
      -- Insert the match
      INSERT INTO matches (id, user1_id, user2_id, pick1_id, pick2_id)
      VALUES (v_new_match_id, NEW.picker_id, v_picked_user_profile.user_id, NEW.id, v_reverse_pick.id);
      
      -- Mark both picks as matched
      UPDATE picks SET is_matched = true WHERE id = NEW.id;
      UPDATE picks SET is_matched = true WHERE id = v_reverse_pick.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;