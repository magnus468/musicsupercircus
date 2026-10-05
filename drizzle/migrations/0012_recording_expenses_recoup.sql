CREATE TABLE public.recording_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_key text NOT NULL,
  description text NOT NULL,
  amount_sek numeric NOT NULL,
  bearers text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recording_expenses TO authenticated;
GRANT ALL ON public.recording_expenses TO service_role;
ALTER TABLE public.recording_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access recording_expenses" ON public.recording_expenses FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

ALTER TABLE public.recording_statements ADD COLUMN usd_sek_rate numeric;

CREATE OR REPLACE FUNCTION public.recording_album_key(a text, s text, p text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(trim(coalesce(nullif(a,''), nullif(s,''), nullif(p,''), 'Okänt album')))
$$;

CREATE OR REPLACE FUNCTION public._recording_ledger()
RETURNS TABLE(statement_id uuid, album_key text, recipient text, gross numeric, deduction numeric, rate numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH st AS (SELECT id, usd_sek_rate AS rate, row_number() OVER (ORDER BY period_start NULLS FIRST, created_at) AS ord FROM recording_statements),
l AS (SELECT statement_id, recording_id, catalog_number, isrc, amount FROM recording_statement_lines),
direct AS (SELECT l.statement_id, s.recipient, l.recording_id, l.amount * s.frac AS amt FROM l JOIN recording_effective_splits s ON s.recording_id = l.recording_id),
cat AS (SELECT statement_id, catalog_number, sum(amount) AS amt FROM l WHERE recording_id IS NULL AND isrc IS NULL AND catalog_number IS NOT NULL GROUP BY 1,2),
catrec AS (SELECT r.catalog_number, r.id, count(*) OVER (PARTITION BY r.catalog_number) AS n FROM recordings r WHERE r.catalog_number IN (SELECT catalog_number FROM cat)),
catpay AS (SELECT cat.statement_id, s.recipient, cr.id AS recording_id, cat.amt / cr.n * s.frac AS amt FROM cat JOIN catrec cr USING (catalog_number) JOIN recording_effective_splits s ON s.recording_id = cr.id),
g AS (
  SELECT a.statement_id, public.recording_album_key(r.album, r.spotify_album, r.project) AS album_key, a.recipient, sum(a.amt) AS gross
  FROM (SELECT * FROM direct UNION ALL SELECT * FROM catpay) a JOIN recordings r ON r.id = a.recording_id GROUP BY 1,2,3
),
pools AS (SELECT e.album_key, e.bearers, sum(e.amount_sek) AS e FROM recording_expenses e GROUP BY 1,2),
pi AS (
  SELECT p.album_key, p.bearers, p.e, g.statement_id, st.ord, st.rate, sum(g.gross) AS inc
  FROM pools p JOIN g ON g.album_key = p.album_key AND (p.bearers IS NULL OR g.recipient = ANY(p.bearers))
  JOIN st ON st.id = g.statement_id WHERE st.rate IS NOT NULL GROUP BY 1,2,3,4,5,6
),
pc AS (SELECT pi.*, coalesce(sum(inc * rate) OVER (PARTITION BY album_key, bearers ORDER BY ord ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS before_sek FROM pi),
pr AS (SELECT pc.*, least(greatest(e - before_sek, 0), inc * rate) / rate AS rec FROM pc WHERE inc > 0),
ded AS (
  SELECT g.statement_id, g.album_key, g.recipient, sum(pr.rec * g.gross / pr.inc) AS d
  FROM pr JOIN g ON g.statement_id = pr.statement_id AND g.album_key = pr.album_key AND (pr.bearers IS NULL OR g.recipient = ANY(pr.bearers))
  GROUP BY 1,2,3
)
SELECT g.statement_id, g.album_key, g.recipient, g.gross, least(coalesce(ded.d, 0), g.gross), st.rate
FROM g LEFT JOIN ded USING (statement_id, album_key, recipient) JOIN st ON st.id = g.statement_id
$$;
REVOKE EXECUTE ON FUNCTION public._recording_ledger() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_statement_payouts(p_statement_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET statement_timeout = '60s' AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH led AS (SELECT * FROM public._recording_ledger() x WHERE x.statement_id = p_statement_id),
  per AS (SELECT recipient, sum(gross) AS gross, sum(deduction) AS recouped, count(DISTINCT album_key)::int AS albums FROM led GROUP BY 1),
  alb AS (SELECT album_key, sum(deduction) AS recouped FROM led GROUP BY 1 HAVING sum(deduction) > 0)
  SELECT jsonb_build_object(
    'total', (SELECT coalesce(sum(amount), 0) FROM recording_statement_lines WHERE statement_id = p_statement_id),
    'distributed', (SELECT coalesce(sum(gross), 0) FROM led),
    'recouped', (SELECT coalesce(sum(deduction), 0) FROM led),
    'missing_rate', (SELECT usd_sek_rate IS NULL FROM recording_statements WHERE id = p_statement_id),
    'has_expenses', EXISTS (SELECT 1 FROM recording_expenses e WHERE e.album_key IN (SELECT album_key FROM led)),
    'albums', (SELECT coalesce(jsonb_agg(jsonb_build_object('album_key', album_key, 'recouped', recouped) ORDER BY recouped DESC), '[]'::jsonb) FROM alb),
    'recipients', (SELECT coalesce(jsonb_agg(jsonb_build_object('recipient', recipient, 'gross', gross, 'recouped', recouped, 'total', gross - recouped, 'albums', albums) ORDER BY gross - recouped DESC), '[]'::jsonb) FROM per)
  ) INTO v;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.get_album_recoup(p_album_key text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET statement_timeout = '60s' AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH led AS (SELECT * FROM public._recording_ledger() x WHERE x.album_key = p_album_key)
  SELECT jsonb_build_object(
    'expenses_sek', (SELECT coalesce(sum(amount_sek), 0) FROM recording_expenses WHERE album_key = p_album_key),
    'recouped_sek', (SELECT coalesce(sum(deduction * rate), 0) FROM led WHERE rate IS NOT NULL),
    'recouped_usd', (SELECT coalesce(sum(deduction), 0) FROM led),
    'statements_missing_rate', (SELECT count(DISTINCT statement_id) FROM led WHERE rate IS NULL)
  ) INTO v;
  RETURN v;
END $$;