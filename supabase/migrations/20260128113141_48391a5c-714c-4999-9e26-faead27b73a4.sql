-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_pick_insert ON public.picks;

-- Recreate the function to work with AFTER INSERT
CREATE OR REPLACE FUNCTION public.check_mutual_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  matched_pick public.picks%ROWTYPE;
  picker_profile public.profiles%ROWTYPE;
BEGIN
  -- First, try to find the picked_user_id based on identifier
  UPDATE public.picks
  SET picked_user_id = (
    SELECT p.user_id
    FROM public.profiles p
    WHERE (NEW.identifier_type = 'email' AND p.email = NEW.picked_identifier)
       OR (NEW.identifier_type = 'phone' AND p.phone = NEW.picked_identifier)
  )
  WHERE id = NEW.id;
  
  -- Refresh NEW with updated data
  SELECT * INTO NEW FROM public.picks WHERE id = NEW.id;
  
  -- If the picked person exists, check for mutual match
  IF NEW.picked_user_id IS NOT NULL THEN
    -- Check if the picked person also picked the current user
    SELECT * INTO matched_pick
    FROM public.picks
    WHERE picker_id = NEW.picked_user_id
      AND picked_user_id = NEW.picker_id
      AND is_matched = false;
    
    IF matched_pick.id IS NOT NULL THEN
      -- We have a mutual match!
      -- Update both picks as matched
      UPDATE public.picks SET is_matched = true WHERE id = NEW.id OR id = matched_pick.id;
      
      -- Create match record (order users by ID to prevent duplicates)
      IF NEW.picker_id < matched_pick.picker_id THEN
        INSERT INTO public.matches (user1_id, user2_id, pick1_id, pick2_id)
        VALUES (NEW.picker_id, matched_pick.picker_id, NEW.id, matched_pick.id);
      ELSE
        INSERT INTO public.matches (user1_id, user2_id, pick1_id, pick2_id)
        VALUES (matched_pick.picker_id, NEW.picker_id, matched_pick.id, NEW.id);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger as AFTER INSERT instead of BEFORE INSERT
CREATE TRIGGER on_pick_insert
  AFTER INSERT ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_mutual_match();