CREATE TABLE public.recording_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  recipient text NOT NULL,
  share numeric NOT NULL DEFAULT 0,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recording_splits TO authenticated;
GRANT ALL ON public.recording_splits TO service_role;
ALTER TABLE public.recording_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access recording_splits" ON public.recording_splits FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX recording_splits_recording_idx ON public.recording_splits(recording_id);

-- Gällande fördelning: egna mottagare om de finns, annars andelarna från ISRC-listan
CREATE OR REPLACE VIEW public.recording_effective_splits WITH (security_invoker = true) AS
  SELECT recording_id, recipient, share / 100.0 AS frac FROM public.recording_splits WHERE share > 0
  UNION ALL
  SELECT r.id, x.name, x.frac
  FROM public.recordings r
  CROSS JOIN LATERAL (VALUES
    (coalesce(nullif(trim(r.artist), ''), 'Artist'), r.split_artist),
    (coalesce(nullif(trim(r.label), ''), 'Bolag'), r.split_label),
    ('Music Super Circus', r.split_msc)
  ) AS x(name, frac)
  WHERE x.frac > 0 AND NOT EXISTS (SELECT 1 FROM public.recording_splits s WHERE s.recording_id = r.id);
GRANT SELECT ON public.recording_effective_splits TO authenticated;
GRANT SELECT ON public.recording_effective_splits TO service_role;

CREATE OR REPLACE FUNCTION public.get_statement_payouts(p_statement_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET statement_timeout = '60s' AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH l AS (
    SELECT recording_id, catalog_number, isrc, amount FROM recording_statement_lines WHERE statement_id = p_statement_id
  ),
  direct AS (
    SELECT s.recipient, l.recording_id, l.amount * s.frac AS amt
    FROM l JOIN recording_effective_splits s ON s.recording_id = l.recording_id
  ),
  cat AS (
    SELECT catalog_number, sum(amount) AS amt FROM l
    WHERE recording_id IS NULL AND isrc IS NULL AND catalog_number IS NOT NULL GROUP BY 1
  ),
  catrec AS (
    SELECT r.catalog_number, r.id, count(*) OVER (PARTITION BY r.catalog_number) AS n
    FROM recordings r WHERE r.catalog_number IN (SELECT catalog_number FROM cat)
  ),
  catpay AS (
    SELECT s.recipient, cr.id AS recording_id, cat.amt / cr.n * s.frac AS amt
    FROM cat JOIN catrec cr USING (catalog_number)
    JOIN recording_effective_splits s ON s.recording_id = cr.id
  ),
  allpay AS (SELECT * FROM direct UNION ALL SELECT * FROM catpay),
  per AS (
    SELECT recipient, sum(amt) AS total, count(DISTINCT recording_id)::int AS tracks
    FROM allpay GROUP BY 1
  )
  SELECT jsonb_build_object(
    'total', (SELECT coalesce(sum(amount), 0) FROM l),
    'distributed', (SELECT coalesce(sum(amt), 0) FROM allpay),
    'recipients', (SELECT coalesce(jsonb_agg(jsonb_build_object('recipient', recipient, 'total', total, 'tracks', tracks) ORDER BY total DESC), '[]'::jsonb) FROM per)
  ) INTO v;
  RETURN v;
END $$;