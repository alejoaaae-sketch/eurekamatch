-- Add app_type column to picks table
ALTER TABLE public.picks ADD COLUMN app_type text NOT NULL DEFAULT 'love';

-- Add constraint for valid app types
ALTER TABLE public.picks ADD CONSTRAINT picks_app_type_check 
CHECK (app_type IN ('love', 'plan', 'sex'));

-- Create index for faster queries by app_type
CREATE INDEX idx_picks_app_type ON public.picks(app_type);

-- Update the pick limit function to check per app_type with different limits
CREATE OR REPLACE FUNCTION public.check_pick_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  max_picks INTEGER;
BEGIN
  -- Set max picks based on app_type
  CASE NEW.app_type
    WHEN 'love' THEN max_picks := 2;
    WHEN 'plan' THEN max_picks := 5;
    WHEN 'sex' THEN max_picks := 2;
    ELSE max_picks := 2;
  END CASE;
  
  -- Count existing picks for this user in this app
  SELECT COUNT(*) INTO current_count
  FROM public.picks
  WHERE picker_id = NEW.picker_id
    AND app_type = NEW.app_type;
  
  IF current_count >= max_picks THEN
    RAISE EXCEPTION 'Pick limit reached for this app. Maximum % picks allowed.', max_picks;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger if it doesn't exist (or recreate)
DROP TRIGGER IF EXISTS check_pick_limit_trigger ON public.picks;
CREATE TRIGGER check_pick_limit_trigger
  BEFORE INSERT ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_pick_limit();