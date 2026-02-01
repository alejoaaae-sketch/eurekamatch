-- Drop the existing overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can soft delete their own picks" ON public.picks;

-- Create a new restrictive UPDATE policy that ONLY allows updating deleted_at
-- This prevents users from manipulating picker_id, is_matched, or picked_user_id
CREATE POLICY "Users can only soft delete their own picks"
ON public.picks
FOR UPDATE
TO authenticated
USING (auth.uid() = picker_id)
WITH CHECK (
  auth.uid() = picker_id
  -- Ensure critical fields cannot be changed by comparing OLD vs NEW implicitly
  -- The user can only set deleted_at, all other fields must remain unchanged
);

-- Create a trigger function to enforce that only deleted_at can be modified
CREATE OR REPLACE FUNCTION public.enforce_pick_soft_delete_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if any field other than deleted_at is being modified
  IF NEW.picker_id != OLD.picker_id THEN
    RAISE EXCEPTION 'Cannot modify picker_id';
  END IF;
  
  IF NEW.picked_identifier != OLD.picked_identifier THEN
    RAISE EXCEPTION 'Cannot modify picked_identifier';
  END IF;
  
  IF NEW.picked_name != OLD.picked_name THEN
    RAISE EXCEPTION 'Cannot modify picked_name';
  END IF;
  
  IF NEW.identifier_type != OLD.identifier_type THEN
    RAISE EXCEPTION 'Cannot modify identifier_type';
  END IF;
  
  IF NEW.is_matched != OLD.is_matched THEN
    RAISE EXCEPTION 'Cannot modify is_matched';
  END IF;
  
  IF NEW.picked_user_id IS DISTINCT FROM OLD.picked_user_id THEN
    RAISE EXCEPTION 'Cannot modify picked_user_id';
  END IF;
  
  IF NEW.app_type != OLD.app_type THEN
    RAISE EXCEPTION 'Cannot modify app_type';
  END IF;
  
  IF NEW.created_at != OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify created_at';
  END IF;
  
  IF NEW.id != OLD.id THEN
    RAISE EXCEPTION 'Cannot modify id';
  END IF;
  
  -- Only deleted_at can be changed
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_pick_soft_delete_only_trigger ON public.picks;
CREATE TRIGGER enforce_pick_soft_delete_only_trigger
  BEFORE UPDATE ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pick_soft_delete_only();