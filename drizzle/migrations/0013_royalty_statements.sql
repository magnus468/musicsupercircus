CREATE TABLE public.royalty_payees (
  recipient text PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  vat_rate numeric NOT NULL DEFAULT 0,
  minimum_payout numeric NOT NULL DEFAULT 500,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.royalty_payees TO authenticated;
GRANT ALL ON public.royalty_payees TO service_role;
ALTER TABLE public.royalty_payees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access royalty_payees" ON public.royalty_payees FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.royalty_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  recipient text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  statement_date date NOT NULL DEFAULT CURRENT_DATE,
  opening_balance numeric NOT NULL DEFAULT 0,
  expenses_sek numeric NOT NULL DEFAULT 0,
  income_downloads_sek numeric NOT NULL DEFAULT 0,
  income_streams_sek numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 0,
  vat_sek numeric NOT NULL DEFAULT 0,
  payable_excl_vat numeric NOT NULL DEFAULT 0,
  payable_incl_vat numeric NOT NULL DEFAULT 0,
  minimum_payout numeric NOT NULL DEFAULT 500,
  outstanding_balance numeric NOT NULL DEFAULT 0,
  fees jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_label, recipient)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.royalty_statements TO authenticated;
GRANT ALL ON public.royalty_statements TO service_role;
ALTER TABLE public.royalty_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access royalty_statements" ON public.royalty_statements FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Intäkter per mottagare för en period (sale_month inom perioden), i SEK enligt avräkningens kurs.
CREATE OR REPLACE FUNCTION public.get_royalty_period(p_start date, p_end date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET statement_timeout = '120s' AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH st AS (
    SELECT id, usd_sek_rate AS rate FROM recording_statements
    WHERE coalesce(period_end, period_start) >= date_trunc('month', p_start) AND period_start <= p_end
  ),
  l AS (
    SELECT x.statement_id, x.recording_id, x.catalog_number, x.isrc, x.amount,
      CASE WHEN x.store ILIKE 'bandcamp' OR x.sale_type ILIKE '%download%' OR x.sale_type ILIKE '%album (f%' OR x.store ILIKE '%itunes%' THEN 'downloads' ELSE 'streams' END AS cat
    FROM recording_statement_lines x JOIN st ON st.id = x.statement_id
    WHERE x.sale_month IS NULL OR (x.sale_month >= to_char(p_start, 'YYYY-MM') AND x.sale_month <= to_char(p_end, 'YYYY-MM'))
  ),
  direct AS (SELECT l.statement_id, l.cat, s.recipient, l.amount * s.frac AS amt FROM l JOIN recording_effective_splits s ON s.recording_id = l.recording_id),
  c AS (SELECT statement_id, cat, catalog_number, sum(amount) AS amt FROM l WHERE recording_id IS NULL AND isrc IS NULL AND catalog_number IS NOT NULL GROUP BY 1,2,3),
  cr AS (SELECT r.catalog_number, r.id, count(*) OVER (PARTITION BY r.catalog_number) AS n FROM recordings r WHERE r.catalog_number IN (SELECT catalog_number FROM c)),
  catpay AS (SELECT c.statement_id, c.cat, s.recipient, c.amt / cr.n * s.frac AS amt FROM c JOIN cr USING (catalog_number) JOIN recording_effective_splits s ON s.recording_id = cr.id),
  a AS (SELECT * FROM direct UNION ALL SELECT * FROM catpay),
  inc AS (
    SELECT a.recipient,
      sum(CASE WHEN a.cat = 'downloads' THEN a.amt * st.rate END) AS downloads,
      sum(CASE WHEN a.cat = 'streams' THEN a.amt * st.rate END) AS streams,
      count(*) FILTER (WHERE st.rate IS NULL) AS missing
    FROM a JOIN st ON st.id = a.statement_id GROUP BY 1
  ),
  rec AS (
    SELECT g.recipient, g.album_key, sum(g.deduction * g.rate) AS sek
    FROM public._recording_ledger() g JOIN st ON st.id = g.statement_id
    WHERE g.rate IS NOT NULL AND g.deduction > 0 GROUP BY 1,2
  ),
  names AS (SELECT DISTINCT ON (public.recording_album_key(album, spotify_album, project)) public.recording_album_key(album, spotify_album, project) AS k,
    coalesce(nullif(album,''), nullif(spotify_album,''), nullif(project,''), 'Okänt album') AS name FROM recordings)
  SELECT jsonb_build_object(
    'statements', (SELECT count(*) FROM st),
    'statements_missing_rate', (SELECT count(*) FROM st WHERE rate IS NULL),
    'recipients', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'recipient', inc.recipient,
        'downloads', coalesce(inc.downloads, 0),
        'streams', coalesce(inc.streams, 0),
        'missing_rate', inc.missing > 0,
        'recoup', coalesce((SELECT jsonb_agg(jsonb_build_object('description', 'Recoup: ' || coalesce(n.name, rec.album_key), 'amount', rec.sek))
                            FROM rec LEFT JOIN names n ON n.k = rec.album_key WHERE rec.recipient = inc.recipient), '[]'::jsonb)
      ) ORDER BY coalesce(inc.downloads,0) + coalesce(inc.streams,0) DESC) FROM inc), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END $$;