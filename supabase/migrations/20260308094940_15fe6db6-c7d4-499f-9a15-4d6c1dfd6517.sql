CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Link picks by email
  UPDATE public.picks
  SET picked_user_id = NEW.id
  WHERE picked_identifier = NEW.email
    AND identifier_type = 'email'
    AND picked_user_id IS NULL;

  -- Extract phone from the generated email pattern (phone-hash@phone.eureka)
  IF NEW.email LIKE '%@phone.eureka' THEN
    v_phone := split_part(NEW.email, '-', 1);
    IF v_phone IS NOT NULL AND v_phone != '' THEN
      -- Link picks by phone (using normalization)
      UPDATE public.picks
      SET picked_user_id = NEW.id
      WHERE identifier_type = 'phone'
        AND picked_user_id IS NULL
        AND normalize_phone(picked_identifier) = normalize_phone(v_phone);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;