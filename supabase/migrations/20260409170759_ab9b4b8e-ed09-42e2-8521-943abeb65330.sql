CREATE TABLE public.settlement_title_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_title text NOT NULL UNIQUE,
  work_title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settlement_title_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mappings"
ON public.settlement_title_mappings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert mappings"
ON public.settlement_title_mappings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete mappings"
ON public.settlement_title_mappings FOR DELETE TO authenticated USING (true);