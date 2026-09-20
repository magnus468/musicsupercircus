CREATE TABLE IF NOT EXISTS public.settlement_stats_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.settlement_stats_cache TO authenticated;
GRANT ALL ON public.settlement_stats_cache TO service_role;

ALTER TABLE public.settlement_stats_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view settlement stats cache" ON public.settlement_stats_cache;
CREATE POLICY "Staff can view settlement stats cache"
ON public.settlement_stats_cache
FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.compute_settlement_stats(p_distribution_key text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    WITH keys AS (
      SELECT
        CASE WHEN position('::' IN token) > 0 THEN split_part(token, '::', 2) ELSE token END AS dk,
        CASE WHEN position('::' IN token) > 0 THEN split_part(token, '::', 1) ELSE NULL END AS pub
      FROM unnest(string_to_array(coalesce(p_distribution_key, ''), ',')) AS token
      WHERE p_distribution_key IS NOT NULL
    ),
    base AS (
      SELECT s.work_title, s.composers, s.country, s.source, s.type_of_right, s.amount
      FROM public.settlements s
      WHERE p_distribution_key IS NULL
         OR EXISTS (
           SELECT 1 FROM keys k
           WHERE s.distribution_key = k.dk
             AND (k.pub IS NULL OR s.publisher = k.pub)
         )
    ),
    totals AS (
      SELECT count(*)::int AS total_rows, coalesce(sum(amount), 0) AS total_amount FROM base
    ),
    by_work AS (
      SELECT work_title AS name, sum(amount) AS amount
      FROM base GROUP BY work_title ORDER BY sum(amount) DESC LIMIT 100
    ),
    by_composer AS (
      SELECT composers AS name, sum(amount) AS amount
      FROM base WHERE composers IS NOT NULL GROUP BY composers ORDER BY sum(amount) DESC LIMIT 15
    ),
    by_country AS (
      SELECT country AS name, sum(amount) AS amount
      FROM base WHERE country IS NOT NULL GROUP BY country ORDER BY sum(amount) DESC LIMIT 10
    ),
    by_source AS (
      SELECT source AS name, sum(amount) AS amount
      FROM base WHERE source IS NOT NULL GROUP BY source ORDER BY sum(amount) DESC
    ),
    by_right AS (
      SELECT type_of_right AS name, sum(amount) AS amount
      FROM base WHERE type_of_right IS NOT NULL GROUP BY type_of_right ORDER BY sum(amount) DESC
    ),
    unique_counts AS (
      SELECT count(DISTINCT work_title)::int AS unique_works, count(DISTINCT country)::int AS unique_countries FROM base
    ),
    periods AS (
      SELECT distribution, distribution_key, publisher,
             coalesce(statement_label, distribution, distribution_key) AS statement_label,
             count(*)::int AS row_count, sum(amount) AS total
      FROM public.settlements
      WHERE distribution_key IS NOT NULL
      GROUP BY distribution, distribution_key, publisher, coalesce(statement_label, distribution, distribution_key)
      ORDER BY distribution_key DESC
    )
    SELECT jsonb_build_object(
      'totalAmount', (SELECT total_amount FROM totals),
      'totalRows', (SELECT total_rows FROM totals),
      'topWorks', (SELECT coalesce(jsonb_agg(jsonb_build_array(name, amount)), '[]'::jsonb) FROM by_work),
      'topComposers', (SELECT coalesce(jsonb_agg(jsonb_build_array(name, amount)), '[]'::jsonb) FROM by_composer),
      'topCountries', (SELECT coalesce(jsonb_agg(jsonb_build_array(name, amount)), '[]'::jsonb) FROM by_country),
      'topSources', (SELECT coalesce(jsonb_agg(jsonb_build_array(name, amount)), '[]'::jsonb) FROM by_source),
      'byRight', (SELECT coalesce(jsonb_object_agg(name, amount), '{}'::jsonb) FROM by_right),
      'uniqueWorks', (SELECT unique_works FROM unique_counts),
      'uniqueCountries', (SELECT unique_countries FROM unique_counts),
      'periods', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'distribution', distribution,
        'distributionKey', distribution_key,
        'publisher', publisher,
        'statementLabel', statement_label,
        'rowCount', row_count,
        'total', total
      )), '[]'::jsonb) FROM periods)
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_settlement_stats(p_distribution_key text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
  v_payload jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_key := coalesce(p_distribution_key, '__all__');

  SELECT payload INTO v_payload FROM public.settlement_stats_cache WHERE cache_key = v_key;
  IF v_payload IS NOT NULL THEN
    RETURN v_payload;
  END IF;

  v_payload := public.compute_settlement_stats(p_distribution_key);

  INSERT INTO public.settlement_stats_cache (cache_key, payload, updated_at)
  VALUES (v_key, v_payload, now())
  ON CONFLICT (cache_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now();

  RETURN v_payload;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_settlement_stats()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.get_settlement_stats(NULL::text);
END;
$function$;

CREATE OR REPLACE FUNCTION public.invalidate_settlement_stats_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.settlement_stats_cache;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS settlements_invalidate_stats_cache ON public.settlements;
CREATE TRIGGER settlements_invalidate_stats_cache
AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.settlements
FOR EACH STATEMENT EXECUTE FUNCTION public.invalidate_settlement_stats_cache();