-- Add soft delete column to picks table
ALTER TABLE public.picks 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient filtering of active picks
CREATE INDEX idx_picks_deleted_at ON public.picks (deleted_at) WHERE deleted_at IS NULL;

-- Update the check_pick_limit function to only count active picks
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
  
  -- Count existing ACTIVE picks for this user in this app (exclude soft-deleted)
  SELECT COUNT(*) INTO current_count
  FROM public.picks
  WHERE picker_id = NEW.picker_id
    AND app_type = NEW.app_type
    AND deleted_at IS NULL;
  
  IF current_count >= max_picks THEN
    RAISE EXCEPTION 'Pick limit reached for this app. Maximum % picks allowed.', max_picks;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update RLS policy for SELECT to only show active picks
DROP POLICY IF EXISTS "Users can view their own picks" ON public.picks;
CREATE POLICY "Users can view their own picks"
ON public.picks
FOR SELECT
USING (auth.uid() = picker_id AND deleted_at IS NULL);

-- Update DELETE policy to prevent hard deletes (will use soft delete instead)
DROP POLICY IF EXISTS "Users can delete their own picks" ON public.picks;
CREATE POLICY "Users cannot hard delete picks"
ON public.picks
FOR DELETE
USING (false);

-- Allow users to update their own picks (for soft delete)
DROP POLICY IF EXISTS "System can update picks via triggers" ON public.picks;
CREATE POLICY "Users can soft delete their own picks"
ON public.picks
FOR UPDATE
USING (auth.uid() = picker_id)
WITH CHECK (auth.uid() = picker_id);