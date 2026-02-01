-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create picks table (secret choices)
CREATE TABLE public.picks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  picker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  picked_identifier TEXT NOT NULL, -- phone or email of the picked person
  picked_name TEXT NOT NULL, -- friendly name for the picker
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('phone', 'email')),
  picked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- set when the picked person joins
  is_matched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on picks
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;

-- Picks policies - CRITICAL: Users can ONLY see their OWN picks
CREATE POLICY "Users can view their own picks"
  ON public.picks FOR SELECT
  USING (auth.uid() = picker_id);

CREATE POLICY "Users can create picks"
  ON public.picks FOR INSERT
  WITH CHECK (auth.uid() = picker_id);

CREATE POLICY "Users can delete their own picks"
  ON public.picks FOR DELETE
  USING (auth.uid() = picker_id);

-- Create matches table (only created when mutual interest exists)
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pick1_id UUID NOT NULL REFERENCES public.picks(id) ON DELETE CASCADE,
  pick2_id UUID NOT NULL REFERENCES public.picks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Enable RLS on matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Matches policies - Users can see matches they are part of
CREATE POLICY "Users can view their own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Function to check for mutual matches when a pick is created
CREATE OR REPLACE FUNCTION public.check_mutual_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_pick public.picks%ROWTYPE;
  picker_profile public.profiles%ROWTYPE;
  new_match_id UUID;
BEGIN
  -- First, try to find the picked_user_id based on identifier
  SELECT p.user_id INTO NEW.picked_user_id
  FROM public.profiles p
  WHERE (NEW.identifier_type = 'email' AND p.email = NEW.picked_identifier)
     OR (NEW.identifier_type = 'phone' AND p.phone = NEW.picked_identifier);
  
  -- If the picked person exists, check for mutual match
  IF NEW.picked_user_id IS NOT NULL THEN
    -- Check if the picked person also picked the current user
    SELECT * INTO matched_pick
    FROM public.picks
    WHERE picker_id = NEW.picked_user_id
      AND picked_user_id = NEW.picker_id
      AND is_matched = false;
    
    IF matched_pick.id IS NOT NULL THEN
      -- We have a mutual match!
      -- Update both picks as matched
      UPDATE public.picks SET is_matched = true WHERE id = NEW.id OR id = matched_pick.id;
      NEW.is_matched := true;
      
      -- Create match record (order users by ID to prevent duplicates)
      IF NEW.picker_id < matched_pick.picker_id THEN
        INSERT INTO public.matches (user1_id, user2_id, pick1_id, pick2_id)
        VALUES (NEW.picker_id, matched_pick.picker_id, NEW.id, matched_pick.id);
      ELSE
        INSERT INTO public.matches (user1_id, user2_id, pick1_id, pick2_id)
        VALUES (matched_pick.picker_id, NEW.picker_id, matched_pick.id, NEW.id);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to check for matches on new picks
CREATE TRIGGER on_pick_created
  BEFORE INSERT ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_mutual_match();

-- Function to update profile timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profile timestamp
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Check if anyone has picked this new user and update their picks
  UPDATE public.picks
  SET picked_user_id = NEW.id
  WHERE picked_identifier = NEW.email
    AND identifier_type = 'email'
    AND picked_user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();