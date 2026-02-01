-- Create secure function to get matched user's profile
-- This verifies the requesting user is part of the match before returning data
CREATE OR REPLACE FUNCTION public.get_matched_user_profile(p_match_id UUID)
RETURNS TABLE(
  email TEXT,
  phone TEXT,
  display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the requesting user is part of this match
  IF NOT EXISTS (
    SELECT 1 FROM public.matches 
    WHERE id = p_match_id 
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You are not part of this match';
  END IF;
  
  -- Return the other user's profile
  RETURN QUERY
  SELECT p.email, p.phone, p.display_name
  FROM public.matches m
  JOIN public.profiles p ON (
    CASE 
      WHEN m.user1_id = auth.uid() THEN p.user_id = m.user2_id
      ELSE p.user_id = m.user1_id
    END
  )
  WHERE m.id = p_match_id;
END;
$$;