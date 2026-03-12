ALTER TABLE public.global_config 
ADD COLUMN max_notifications_per_recipient_month integer NOT NULL DEFAULT 5,
ADD COLUMN max_notifications_per_recipient_total integer NOT NULL DEFAULT 10;