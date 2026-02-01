-- Drop the old constraint and create a new one with all languages
ALTER TABLE public.profiles DROP CONSTRAINT valid_language;

ALTER TABLE public.profiles ADD CONSTRAINT valid_language 
CHECK (language = ANY (ARRAY['es', 'en', 'eu', 'ca', 'fr']));