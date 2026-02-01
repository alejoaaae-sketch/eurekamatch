-- Fix recurring security finding: convert matches_safe into a real RLS-protected table
-- The security scanner flags views as missing RLS. Making this a table stops the recurring false positive
-- while keeping the same safe column set (no pick IDs).

-- 1) Drop matches_safe if it exists as a view/materialized view
DO $$
DECLARE
  v_kind char;
BEGIN
  SELECT c.relkind INTO v_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'matches_safe';

  IF v_kind = 'v' THEN
    EXECUTE 'DROP VIEW public.matches_safe';
  ELSIF v_kind = 'm' THEN
    EXECUTE 'DROP MATERIALIZED VIEW public.matches_safe';
  END IF;
END $$;

-- 2) Create the table (id/user1_id/user2_id/created_at only)
CREATE TABLE IF NOT EXISTS public.matches_safe (
  id uuid PRIMARY KEY,
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Ensure RLS is enabled and policies are present
ALTER TABLE public.matches_safe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own matches_safe" ON public.matches_safe;
DROP POLICY IF EXISTS "Users cannot insert matches_safe" ON public.matches_safe;
DROP POLICY IF EXISTS "Users cannot update matches_safe" ON public.matches_safe;
DROP POLICY IF EXISTS "Users cannot delete matches_safe" ON public.matches_safe;

CREATE POLICY "Users can view their own matches_safe"
ON public.matches_safe
FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users cannot insert matches_safe"
ON public.matches_safe
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Users cannot update matches_safe"
ON public.matches_safe
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "Users cannot delete matches_safe"
ON public.matches_safe
FOR DELETE
USING (false);

-- 4) Lock down privileges: no anonymous access; only authenticated SELECT
REVOKE ALL ON public.matches_safe FROM anon;
REVOKE ALL ON public.matches_safe FROM PUBLIC;
GRANT SELECT ON public.matches_safe TO authenticated;

-- 5) Keep matches_safe synced from matches
CREATE OR REPLACE FUNCTION public.sync_matches_safe_from_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.matches_safe (id, user1_id, user2_id, created_at)
  VALUES (NEW.id, NEW.user1_id, NEW.user2_id, NEW.created_at)
  ON CONFLICT (id) DO UPDATE
    SET user1_id = EXCLUDED.user1_id,
        user2_id = EXCLUDED.user2_id,
        created_at = EXCLUDED.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_sync_matches_safe ON public.matches;
CREATE TRIGGER matches_sync_matches_safe
AFTER INSERT OR UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.sync_matches_safe_from_matches();

-- 6) Backfill existing matches
INSERT INTO public.matches_safe (id, user1_id, user2_id, created_at)
SELECT m.id, m.user1_id, m.user2_id, m.created_at
FROM public.matches m
ON CONFLICT (id) DO UPDATE
  SET user1_id = EXCLUDED.user1_id,
      user2_id = EXCLUDED.user2_id,
      created_at = EXCLUDED.created_at;
