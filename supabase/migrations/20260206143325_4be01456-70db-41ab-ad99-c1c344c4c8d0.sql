-- Fix: Make notify_match_created non-blocking so match creation doesn't fail
-- if http_post is unavailable. Use pg_net instead, or catch the error.
CREATE OR REPLACE FUNCTION public.notify_match_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_type text;
BEGIN
  -- Get the app_type from one of the picks
  SELECT app_type INTO v_app_type
  FROM public.picks
  WHERE id = NEW.pick1_id;

  -- Try to call the edge function, but don't let it block match creation
  BEGIN
    PERFORM net.http_post(
      url := 'https://mnfseybrfzexacyzjqwh.supabase.co/functions/v1/send-match-notification',
      body := jsonb_build_object(
        'matchId', NEW.id,
        'user1Id', NEW.user1_id,
        'user2Id', NEW.user2_id,
        'appType', COALESCE(v_app_type, 'love')
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail - match creation is more important than notification
    RAISE WARNING 'Failed to send match notification for match %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;