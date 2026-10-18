CREATE TABLE public.work_party_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  party_name text NOT NULL,
  is_publisher boolean NOT NULL DEFAULT false,
  ipi_number text,
  agreement_number text,
  source text NOT NULL DEFAULT 'client',
  conflict boolean NOT NULL DEFAULT false,
  conflict_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, party_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_party_numbers TO authenticated;
GRANT ALL ON public.work_party_numbers TO service_role;
ALTER TABLE public.work_party_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage work_party_numbers" ON public.work_party_numbers
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX work_party_numbers_work_id_idx ON public.work_party_numbers (work_id);
CREATE INDEX work_party_numbers_conflict_idx ON public.work_party_numbers (conflict) WHERE conflict;