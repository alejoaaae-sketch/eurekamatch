ALTER TABLE public.app_config DROP CONSTRAINT app_config_app_mode_check;
ALTER TABLE public.app_config ADD CONSTRAINT app_config_app_mode_check CHECK (app_mode = ANY (ARRAY['love'::text, 'friends'::text, 'mude'::text, 'colab'::text]));

INSERT INTO public.app_config (app_mode, max_picks, free_changes_per_month, price_per_change, enabled)
VALUES ('colab', 5, 0, 0.99, true);