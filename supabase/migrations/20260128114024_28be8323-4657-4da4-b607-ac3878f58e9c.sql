-- Remove the old BEFORE INSERT trigger that was causing issues
DROP TRIGGER IF EXISTS on_pick_created ON public.picks;

-- Keep only the AFTER INSERT trigger (on_pick_insert)