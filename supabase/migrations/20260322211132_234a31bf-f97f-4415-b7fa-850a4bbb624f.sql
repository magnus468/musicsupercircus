
CREATE TABLE public.project_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  UNIQUE (project_id, agreement_id)
);

ALTER TABLE public.project_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project_agreements" ON public.project_agreements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert project_agreements" ON public.project_agreements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update project_agreements" ON public.project_agreements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete project_agreements" ON public.project_agreements FOR DELETE TO authenticated USING (true);
