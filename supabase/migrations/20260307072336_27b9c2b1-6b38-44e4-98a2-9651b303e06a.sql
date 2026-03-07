
ALTER TABLE public.global_config 
ADD COLUMN beta_countries text[] NOT NULL DEFAULT '{}',
ADD COLUMN notification_countries text[] NOT NULL DEFAULT '{}';
