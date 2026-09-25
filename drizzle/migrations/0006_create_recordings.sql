CREATE TABLE public.recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_number text,
  project text,
  album text,
  artist text,
  track text NOT NULL,
  composer text,
  isrc text,
  split_artist numeric,
  split_label numeric,
  split_msc numeric,
  label text,
  expenses text,
  sr_uploaded boolean NOT NULL DEFAULT false,
  ifpi_registered boolean NOT NULL DEFAULT false,
  work_id uuid REFERENCES public.works(id) ON DELETE SET NULL,
  audio_url text,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recordings TO authenticated;
GRANT ALL ON public.recordings TO service_role;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access recordings" ON public.recordings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX recordings_isrc_idx ON public.recordings(isrc);
CREATE INDEX recordings_work_idx ON public.recordings(work_id);
CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON public.recordings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();