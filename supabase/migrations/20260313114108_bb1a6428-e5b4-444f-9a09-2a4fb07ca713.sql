CREATE POLICY "Anon can read global_config"
ON public.global_config
FOR SELECT
TO anon
USING (true);