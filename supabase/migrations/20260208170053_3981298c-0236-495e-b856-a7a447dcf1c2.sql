-- Drop the blanket block-all for anon (it blocks SELECT too)
DROP POLICY IF EXISTS "Block anon on app_config" ON public.app_config;

-- Drop the new permissive policy we just added (not useful with restrictive approach)
DROP POLICY IF EXISTS "Anyone can read app_config" ON public.app_config;

-- Allow anon SELECT (restrictive but with true - works alongside existing authenticated SELECT)
CREATE POLICY "Anon can read app_config"
ON public.app_config
FOR SELECT
TO anon
USING (true);

-- Block anon writes only
CREATE POLICY "Block anon writes on app_config"
ON public.app_config
FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "Block anon update on app_config"
ON public.app_config
FOR UPDATE
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Block anon delete on app_config"
ON public.app_config
FOR DELETE
TO anon
USING (false);
