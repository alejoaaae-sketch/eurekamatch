
-- Add notification settings to global_config
ALTER TABLE public.global_config
ADD COLUMN notifications_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN notification_sms_template text NOT NULL DEFAULT 'Alguien ha pensado en ti en EurekaMatch 💫 Descubre quién en eurekamatch.lovable.app';

-- Create pick_notifications table for rate limiting
CREATE TABLE public.pick_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pick_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_user_id uuid NOT NULL,
  recipient_phone text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pick_notifications ENABLE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anon on pick_notifications"
ON public.pick_notifications FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Users can view their own sent notifications
CREATE POLICY "Users can view own sent notifications"
ON public.pick_notifications FOR SELECT
TO authenticated
USING (auth.uid() = sender_id);

-- Users can insert own notifications
CREATE POLICY "Users can insert own notifications"
ON public.pick_notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Block updates and deletes
CREATE POLICY "Block updates on pick_notifications"
ON public.pick_notifications FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block deletes on pick_notifications"
ON public.pick_notifications FOR DELETE
TO authenticated
USING (false);

-- Index for fast lookups: has this pick been notified this month?
CREATE INDEX idx_pick_notifications_pick_month
ON public.pick_notifications (pick_id, created_at);

CREATE INDEX idx_pick_notifications_sender
ON public.pick_notifications (sender_id);
