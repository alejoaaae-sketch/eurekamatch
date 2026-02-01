-- Add explicit restrictive policy to deny anonymous access to profiles
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);