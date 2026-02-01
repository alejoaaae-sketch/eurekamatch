-- Add language preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN language text NOT NULL DEFAULT 'es';

-- Add check constraint for valid language codes
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_language CHECK (language IN ('es', 'en', 'eu'));