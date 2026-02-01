-- Add explicit RESTRICTIVE DELETE policy to prevent any profile deletions
CREATE POLICY "Users cannot delete profiles"
ON public.profiles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

-- Also block anonymous users from deleting
CREATE POLICY "Anonymous cannot delete profiles"
ON public.profiles
AS RESTRICTIVE
FOR DELETE
TO anon
USING (false);