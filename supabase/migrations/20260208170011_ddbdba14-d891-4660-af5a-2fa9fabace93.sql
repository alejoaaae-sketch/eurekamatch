-- Allow anyone (including anon) to read app_config enabled status
CREATE POLICY "Anyone can read app_config"
ON public.app_config
FOR SELECT
TO anon, authenticated
USING (true);
