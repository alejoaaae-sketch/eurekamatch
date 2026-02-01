-- Fix: Create function with correct trigger name
CREATE OR REPLACE FUNCTION public.fix_picked_user_id(
  p_pick_id uuid,
  p_picked_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Disable the trigger temporarily
  ALTER TABLE picks DISABLE TRIGGER enforce_pick_soft_delete_only_trigger;
  
  UPDATE picks 
  SET picked_user_id = p_picked_user_id
  WHERE id = p_pick_id;
  
  -- Re-enable the trigger
  ALTER TABLE picks ENABLE TRIGGER enforce_pick_soft_delete_only_trigger;
END;
$$;

-- Fix the picks that have null picked_user_id but are matched
SELECT fix_picked_user_id('3f5fc9af-ef93-4c58-9efb-de1fc96e8c4e', '6ac0f6e8-0682-4e7e-80c6-95deede85d34');
SELECT fix_picked_user_id('7d22d4d3-e55d-476d-a48a-ca1148821054', 'a7e34db7-4001-43bd-a7fc-c7c667ac76ac');

-- Drop the function after use
DROP FUNCTION public.fix_picked_user_id(uuid, uuid);