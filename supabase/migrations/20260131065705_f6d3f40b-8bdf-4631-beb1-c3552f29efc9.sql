
-- Fix normalize_phone to correctly strip country codes
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
  
  -- Step 2: Remove country prefixes
  -- Pattern: +XX or +XXX followed by the rest of the number
  IF cleaned ~ '^\+34' THEN
    -- Spain: +34
    cleaned := substring(cleaned from 4);
  ELSIF cleaned ~ '^\+[0-9]' THEN
    -- Other single digit codes (+1 for US/Canada)
    IF cleaned ~ '^\+1[2-9]' THEN
      cleaned := substring(cleaned from 3);
    -- Other 2-digit codes
    ELSIF cleaned ~ '^\+[1-9][0-9][0-9]' THEN
      cleaned := substring(cleaned from 5); -- +XXX
    ELSE
      cleaned := substring(cleaned from 4); -- +XX
    END IF;
  ELSIF cleaned ~ '^0034' THEN
    -- Spain international: 0034
    cleaned := substring(cleaned from 5);
  ELSIF cleaned ~ '^34[6-9]' THEN
    -- Spain without +: 34 followed by mobile (6,7,8,9)
    cleaned := substring(cleaned from 3);
  END IF;
  
  RETURN cleaned;
END;
$function$;
