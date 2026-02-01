CREATE OR REPLACE FUNCTION public.enforce_pick_soft_delete_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow internal updates executed from within other triggers/functions
  -- (e.g., matching logic that sets picked_user_id / is_matched).
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

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

  -- Only deleted_at can be changed by direct user updates
  RETURN NEW;
END;
$function$;
