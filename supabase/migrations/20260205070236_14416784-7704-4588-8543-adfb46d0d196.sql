-- Remove hardcoded anon key from notify_match_created trigger
-- The edge function validates match authenticity via database lookups and timing checks

CREATE OR REPLACE FUNCTION public.notify_match_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_app_type text;
BEGIN
  -- Get the app_type from one of the picks
  SELECT app_type INTO v_app_type
  FROM public.picks
  WHERE id = NEW.pick1_id;

  -- Call the edge function via HTTP
  -- No Authorization header needed - the edge function validates 
  -- the match exists and was created recently
  PERFORM extensions.http_post(
    url := 'https://mnfseybrfzexacyzjqwh.supabase.co/functions/v1/send-match-notification',
    body := jsonb_build_object(
      'matchId', NEW.id,
      'user1Id', NEW.user1_id,
      'user2Id', NEW.user2_id,
      'appType', COALESCE(v_app_type, 'love')
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );

  RETURN NEW;
END;
$function$;