-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to call the edge function when a match is created
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
  PERFORM extensions.http_post(
    url := 'https://mnfseybrfzexacyzjqwh.supabase.co/functions/v1/send-match-notification',
    body := jsonb_build_object(
      'matchId', NEW.id,
      'user1Id', NEW.user1_id,
      'user2Id', NEW.user2_id,
      'appType', COALESCE(v_app_type, 'love')
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZnNleWJyZnpleGFjeXpqcXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MzE0NTQsImV4cCI6MjA4NTUwNzQ1NH0.W5hw_vUXHJWz4kYqkhydmL52TrxV5fJP2WSmDfg8E7A'
    )
  );

  RETURN NEW;
END;
$function$;

-- Create trigger on matches table
CREATE TRIGGER on_match_created
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_match_created();