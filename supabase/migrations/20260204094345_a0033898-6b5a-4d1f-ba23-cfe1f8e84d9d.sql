-- Drop existing SELECT policy and recreate with explicit restriction
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a PERMISSIVE SELECT policy (required for any access)
-- This ensures users can ONLY see their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Also ensure there's no way for authenticated users to see others' profiles
-- by adding an explicit deny for viewing other users
-- (The above policy already handles this, but let's verify RLS is enforced)