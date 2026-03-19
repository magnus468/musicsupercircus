
CREATE TYPE public.publishing_type AS ENUM ('original', 'MSCE', 'MSCP');
CREATE TYPE public.stim_status AS ENUM ('anmäld', 'claimad', 'ej_anmäld');

CREATE TABLE public.works (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  project TEXT,
  creators TEXT NOT NULL,
  stim_status stim_status NOT NULL DEFAULT 'ej_anmäld',
  stim_comment TEXT,
  publishing_type publishing_type NOT NULL DEFAULT 'original',
  co_publishers TEXT[],
  share_percentage NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view works"
  ON public.works FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert works"
  ON public.works FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update works"
  ON public.works FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete works"
  ON public.works FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_works_updated_at
  BEFORE UPDATE ON public.works
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_works_title ON public.works USING gin(to_tsvector('simple', title));
CREATE INDEX idx_works_creators ON public.works USING gin(to_tsvector('simple', creators));
CREATE INDEX idx_works_project ON public.works USING gin(to_tsvector('simple', coalesce(project, '')));
