
ALTER TABLE public.global_config
ADD COLUMN verify_mobile boolean NOT NULL DEFAULT false,
ADD COLUMN verify_email boolean NOT NULL DEFAULT true;
