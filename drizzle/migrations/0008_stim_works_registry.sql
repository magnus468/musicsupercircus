CREATE TABLE public.stim_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ice_work_key text NOT NULL UNIQUE,
  title text NOT NULL,
  roles text,
  creators text,
  ipi_numbers text[],
  work_type text,
  status text,
  conflict boolean NOT NULL DEFAULT false,
  publisher text NOT NULL DEFAULT 'MSCE',
  work_id uuid REFERENCES public.works(id) ON DELETE SET NULL,
  match_status text NOT NULL DEFAULT 'unmatched',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stim_works TO authenticated;
GRANT ALL ON public.stim_works TO service_role;
ALTER TABLE public.stim_works ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access stim_works" ON public.stim_works FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX stim_works_work_id_idx ON public.stim_works(work_id);
ALTER TABLE public.works ADD COLUMN stim_work_key text;
ALTER TABLE public.works ADD COLUMN stim_conflict boolean;