
-- Improve normalize_phone to handle country prefixes
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  cleaned text;
BEGIN
  IF phone_input IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Step 1: Remove spaces, dots, dashes, parentheses, and other common separators
  cleaned := regexp_replace(phone_input, '[\s\.\-\(\)]+', '', 'g');
  
  -- Step 2: Remove common country prefixes (Spain +34, 0034, 34 at start)
  -- Also handles other common prefixes
  IF cleaned ~ '^\+' THEN
    -- Remove the + and country code (assume 1-3 digits after +)
    cleaned := regexp_replace(cleaned, '^\+[0-9]{1,3}', '');
  ELSIF cleaned ~ '^00' THEN
    -- International format 00XX
    cleaned := regexp_replace(cleaned, '^00[0-9]{1,3}', '');
  ELSIF cleaned ~ '^34[6-9]' THEN
    -- Spanish format starting with 34 followed by mobile prefix (6,7,8,9)
    cleaned := regexp_replace(cleaned, '^34', '');
  END IF;
  
  RETURN cleaned;
END;
$function$;
