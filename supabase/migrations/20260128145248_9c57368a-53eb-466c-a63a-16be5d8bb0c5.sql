-- Update the language check constraint to include catalan and french
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_language_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_language_check CHECK (language IN ('es', 'en', 'eu', 'ca', 'fr'));