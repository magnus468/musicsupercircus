CREATE TABLE public.internal_cron_secret (id boolean PRIMARY KEY DEFAULT true CHECK (id), secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32),'hex'));
REVOKE ALL ON public.internal_cron_secret FROM anon, authenticated;
GRANT ALL ON public.internal_cron_secret TO service_role;
ALTER TABLE public.internal_cron_secret ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_cron_secret DEFAULT VALUES;