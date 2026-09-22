CREATE OR REPLACE FUNCTION public.compute_settlement_stats(p_distribution_key text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
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
    base AS MATERIALIZED (
      SELECT s.work_title, s.composers, s.country, s.source, s.type_of_right,
             s.amount, s.distribution, s.distribution_key, s.publisher
      FROM public.settlements s
      WHERE p_distribution_key IS NULL
         OR EXISTS (
           SELECT 1 FROM keys k
           WHERE s.distribution_key = k.dk
             AND (k.pub IS NULL OR s.publisher = k.pub)
         )
    ),
    aggregates AS MATERIALIZED (
      SELECT
        CASE
          WHEN grouping(work_title) = 0 THEN 'work'
          WHEN grouping(composers) = 0 THEN 'composer'
          WHEN grouping(country) = 0 THEN 'country'
          WHEN grouping(source) = 0 THEN 'source'
          WHEN grouping(type_of_right) = 0 THEN 'right'
          WHEN grouping(distribution_key) = 0 THEN 'period'
          ELSE 'total'
        END AS kind,
        CASE
          WHEN grouping(work_title) = 0 THEN work_title
          WHEN grouping(composers) = 0 THEN composers
          WHEN grouping(country) = 0 THEN country
          WHEN grouping(source) = 0 THEN source
          WHEN grouping(type_of_right) = 0 THEN type_of_right
          ELSE NULL
        END AS name,
        distribution,
        distribution_key,
        publisher,
        count(*)::int AS row_count,
        coalesce(sum(amount), 0) AS amount
      FROM base
      GROUP BY GROUPING SETS (
        (),
        (work_title),
        (composers),
        (country),
        (source),
        (type_of_right),
        (distribution, distribution_key, publisher)
      )
    ),
    global_periods AS (
      SELECT distribution, distribution_key, publisher,
             count(*)::int AS row_count, coalesce(sum(amount), 0) AS amount
      FROM public.settlements
      WHERE p_distribution_key IS NOT NULL
        AND distribution_key IS NOT NULL
      GROUP BY distribution, distribution_key, publisher
    ),
    periods AS (
      SELECT distribution, distribution_key, publisher, row_count, amount
      FROM aggregates
      WHERE kind = 'period' AND distribution_key IS NOT NULL
        AND p_distribution_key IS NULL
      UNION ALL
      SELECT distribution, distribution_key, publisher, row_count, amount
      FROM global_periods
    )
    SELECT jsonb_build_object(
      'totalAmount', coalesce((SELECT amount FROM aggregates WHERE kind = 'total'), 0),
      'totalRows', coalesce((SELECT row_count FROM aggregates WHERE kind = 'total'), 0),
      'topWorks', (
        SELECT coalesce(jsonb_agg(jsonb_build_array(name, amount) ORDER BY amount DESC), '[]'::jsonb)
        FROM (SELECT name, amount FROM aggregates WHERE kind = 'work' AND name IS NOT NULL ORDER BY amount DESC LIMIT 100) ranked
      ),
      'topComposers', (
        SELECT coalesce(jsonb_agg(jsonb_build_array(name, amount) ORDER BY amount DESC), '[]'::jsonb)
        FROM (SELECT name, amount FROM aggregates WHERE kind = 'composer' AND name IS NOT NULL ORDER BY amount DESC LIMIT 15) ranked
      ),
      'topCountries', (
        SELECT coalesce(jsonb_agg(jsonb_build_array(name, amount) ORDER BY amount DESC), '[]'::jsonb)
        FROM (SELECT name, amount FROM aggregates WHERE kind = 'country' AND name IS NOT NULL ORDER BY amount DESC LIMIT 10) ranked
      ),
      'topSources', (
        SELECT coalesce(jsonb_agg(jsonb_build_array(name, amount) ORDER BY amount DESC), '[]'::jsonb)
        FROM (SELECT name, amount FROM aggregates WHERE kind = 'source' AND name IS NOT NULL ORDER BY amount DESC) ranked
      ),
      'byRight', (
        SELECT coalesce(jsonb_object_agg(name, amount), '{}'::jsonb)
        FROM aggregates WHERE kind = 'right' AND name IS NOT NULL
      ),
      'uniqueWorks', (SELECT count(*)::int FROM aggregates WHERE kind = 'work' AND name IS NOT NULL),
      'uniqueCountries', (SELECT count(*)::int FROM aggregates WHERE kind = 'country' AND name IS NOT NULL),
      'periods', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'distribution', distribution,
          'distributionKey', distribution_key,
          'publisher', publisher,
          'statementLabel', distribution,
          'rowCount', row_count,
          'total', amount
        ) ORDER BY distribution_key DESC), '[]'::jsonb)
        FROM periods
      )
    )
  );
END;
$function$;

ALTER FUNCTION public.get_settlement_stats(text) SET statement_timeout TO '60s';
ALTER FUNCTION public.get_settlement_stats() SET statement_timeout TO '60s';