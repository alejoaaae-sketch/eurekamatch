-- Fix security warning: set search_path for normalize_phone function
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF phone_input IS NULL THEN
    RETURN NULL;
  END IF;
  -- Remove spaces, dots, dashes, parentheses, and other common separators
  RETURN regexp_replace(phone_input, '[\s\.\-\(\)]+', '', 'g');
END;
$$;