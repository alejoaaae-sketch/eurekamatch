
-- Function to check for matches when a user updates their phone number
CREATE OR REPLACE FUNCTION public.check_matches_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    LOOP
      -- Check if this user also picked the picker
      SELECT * INTO matched_pick
      FROM public.picks
      WHERE picker_id = NEW.user_id
        AND picked_user_id = pick_record.picker_id
        AND is_matched = false;
      
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
$$;

-- Trigger for profile updates
DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_matches_on_profile_update();
