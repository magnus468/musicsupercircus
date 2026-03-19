
-- Agreements table
CREATE TABLE public.agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  agreement_type text NOT NULL DEFAULT 'original',
  agreement_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  share_percentage numeric,
  status text NOT NULL DEFAULT 'active',
  notes text,
  file_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Junction table: agreement <-> works
CREATE TABLE public.agreement_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid REFERENCES public.agreements(id) ON DELETE CASCADE NOT NULL,
  work_id uuid REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(agreement_id, work_id)
);

-- RLS
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agreements" ON public.agreements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert agreements" ON public.agreements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update agreements" ON public.agreements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete agreements" ON public.agreements FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view agreement_works" ON public.agreement_works FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert agreement_works" ON public.agreement_works FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete agreement_works" ON public.agreement_works FOR DELETE TO authenticated USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for signed agreements
INSERT INTO storage.buckets (id, name, public) VALUES ('agreements', 'agreements', false);

-- Storage RLS
CREATE POLICY "Authenticated users can upload agreements" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agreements');
CREATE POLICY "Authenticated users can view agreements files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'agreements');
CREATE POLICY "Authenticated users can delete agreement files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'agreements');
