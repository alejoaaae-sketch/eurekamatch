-- Drop the overly permissive policy that only checks if user is authenticated
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- The existing "Users can view their own profile" policy with (auth.uid() = user_id) 
-- already correctly restricts access to only the user's own profile