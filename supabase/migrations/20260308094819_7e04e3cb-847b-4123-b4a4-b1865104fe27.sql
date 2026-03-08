-- Temporarily disable the trigger to fix unlinked picks
ALTER TABLE public.picks DISABLE TRIGGER enforce_pick_soft_delete_only_trigger;

-- Fix this specific pick
UPDATE public.picks 
SET picked_user_id = '43c19eca-a954-45d3-ad1a-e7390b74a73c' 
WHERE id = 'b1a8fe8b-d4ea-47a3-9ea9-a9e3d6edd1d4' AND picked_user_id IS NULL;

-- Also fix any other unlinked picks that match registered users by phone
UPDATE public.picks p
SET picked_user_id = pr.user_id
FROM public.profiles pr
WHERE p.identifier_type = 'phone'
  AND p.picked_user_id IS NULL
  AND p.deleted_at IS NULL
  AND normalize_phone(p.picked_identifier) = normalize_phone(pr.phone)
  AND pr.user_id != p.picker_id;

-- Also fix unlinked picks by email
UPDATE public.picks p
SET picked_user_id = pr.user_id
FROM public.profiles pr
WHERE p.identifier_type = 'email'
  AND p.picked_user_id IS NULL
  AND p.deleted_at IS NULL
  AND LOWER(p.picked_identifier) = LOWER(pr.email)
  AND pr.user_id != p.picker_id;

-- Re-enable the trigger
ALTER TABLE public.picks ENABLE TRIGGER enforce_pick_soft_delete_only_trigger;