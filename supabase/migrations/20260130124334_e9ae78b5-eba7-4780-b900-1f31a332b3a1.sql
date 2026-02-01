-- Revoke all permissions from anonymous users on picks table
REVOKE ALL ON public.picks FROM anon;

-- Ensure only authenticated users have access (through RLS policies)
GRANT SELECT, INSERT, UPDATE ON public.picks TO authenticated;