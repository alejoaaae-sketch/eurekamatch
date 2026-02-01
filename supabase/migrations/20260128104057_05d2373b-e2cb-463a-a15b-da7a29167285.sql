-- Function to check pick limit before insert
CREATE OR REPLACE FUNCTION public.check_pick_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
  max_picks INTEGER := 2;
BEGIN
  -- Count existing picks for this user
  SELECT COUNT(*) INTO current_count
  FROM public.picks
  WHERE picker_id = NEW.picker_id;
  
  IF current_count >= max_picks THEN
    RAISE EXCEPTION 'Pick limit reached. Maximum % picks allowed.', max_picks;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to enforce pick limit
DROP TRIGGER IF EXISTS check_pick_limit_trigger ON public.picks;
CREATE TRIGGER check_pick_limit_trigger
  BEFORE INSERT ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_pick_limit();