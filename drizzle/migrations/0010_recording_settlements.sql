CREATE TABLE public.recording_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  period_label text NOT NULL,
  period_start date,
  period_end date,
  currency text NOT NULL DEFAULT 'USD',
  file_name text,
  total_amount numeric NOT NULL DEFAULT 0,
  row_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recording_statements TO authenticated;
GRANT ALL ON public.recording_statements TO service_role;
ALTER TABLE public.recording_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access recording_statements" ON public.recording_statements FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.recording_statement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES public.recording_statements(id) ON DELETE CASCADE,
  recording_id uuid REFERENCES public.recordings(id) ON DELETE SET NULL,
  isrc text,
  upc text,
  catalog_number text,
  title text,
  release_title text,
  artist text,
  store text,
  country text,
  sale_type text,
  sale_month text,
  quantity integer NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recording_statement_lines TO authenticated;
GRANT ALL ON public.recording_statement_lines TO service_role;
ALTER TABLE public.recording_statement_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access recording_statement_lines" ON public.recording_statement_lines FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX recording_statement_lines_statement_idx ON public.recording_statement_lines(statement_id);
CREATE INDEX recording_statement_lines_recording_idx ON public.recording_statement_lines(recording_id);
CREATE INDEX recording_statement_lines_isrc_idx ON public.recording_statement_lines(isrc);
CREATE INDEX recording_statement_lines_catalog_idx ON public.recording_statement_lines(catalog_number);

CREATE OR REPLACE FUNCTION public.get_recording_income()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET statement_timeout = '60s' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN jsonb_build_object(
    'byRecording', (SELECT coalesce(jsonb_object_agg(recording_id, t), '{}'::jsonb) FROM (
       SELECT recording_id, sum(amount) t FROM recording_statement_lines WHERE recording_id IS NOT NULL GROUP BY 1) a),
    'byCatalog', (SELECT coalesce(jsonb_object_agg(catalog_number, t), '{}'::jsonb) FROM (
       SELECT catalog_number, sum(amount) t FROM recording_statement_lines WHERE recording_id IS NULL AND catalog_number IS NOT NULL GROUP BY 1) b)
  );
END $$;