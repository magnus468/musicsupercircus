CREATE TABLE public.settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_title text NOT NULL,
  work_key text,
  amount numeric NOT NULL DEFAULT 0,
  distribution text,
  distribution_key text,
  recipient_name text,
  member_number text,
  ipi_name_number text,
  role text,
  share numeric,
  type_of_right text,
  country text,
  source text,
  sub_source text,
  production_title text,
  episode_title text,
  agreement_key text,
  number_of_uses integer DEFAULT 0,
  from_date date,
  to_date date,
  composers text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settlements" ON public.settlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert settlements" ON public.settlements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete settlements" ON public.settlements FOR DELETE TO authenticated USING (true);