-- Revoke all permissions from anonymous users on profiles table
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM PUBLIC;

-- Ensure only authenticated users have access (through RLS policies)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;