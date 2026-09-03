CREATE OR REPLACE FUNCTION public.get_settlement_stats(p_distribution_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_distribution_key IS NULL THEN
    RETURN (
      WITH base AS (
        SELECT work_title, composers, country, source, type_of_right, amount
        FROM public.settlements
      ),
      totals AS (
        SELECT count(*)::int AS total_rows, coalesce(sum(amount), 0) AS total_amount
        FROM base
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
        SELECT
          count(DISTINCT work_title)::int AS unique_works,
          count(DISTINCT country)::int AS unique_countries
        FROM base
      ),
      periods AS (
        SELECT distribution, distribution_key, publisher, count(*)::int AS row_count, sum(amount) AS total
        FROM public.settlements
        WHERE distribution_key IS NOT NULL
        GROUP BY distribution, distribution_key, publisher
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
          'rowCount', row_count,
          'total', total
        )), '[]'::jsonb) FROM periods)
      )
    );
  ELSE
    RETURN (
      WITH keys AS (
        SELECT
          CASE WHEN position('::' IN token) > 0 THEN split_part(token, '::', 2) ELSE token END AS dk,
          CASE WHEN position('::' IN token) > 0 THEN split_part(token, '::', 1) ELSE NULL END AS pub
        FROM unnest(string_to_array(p_distribution_key, ',')) AS token
      ),
      base AS (
        SELECT s.work_title, s.composers, s.country, s.source, s.type_of_right, s.amount
        FROM public.settlements s
        INNER JOIN keys k
          ON s.distribution_key = k.dk
         AND (k.pub IS NULL OR s.publisher = k.pub)
      ),
      totals AS (
        SELECT count(*)::int AS total_rows, coalesce(sum(amount), 0) AS total_amount
        FROM base
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
        SELECT
          count(DISTINCT work_title)::int AS unique_works,
          count(DISTINCT country)::int AS unique_countries
        FROM base
      ),
      periods AS (
        SELECT distribution, distribution_key, publisher, count(*)::int AS row_count, sum(amount) AS total
        FROM public.settlements
        WHERE distribution_key IS NOT NULL
        GROUP BY distribution, distribution_key, publisher
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
          'rowCount', row_count,
          'total', total
        )), '[]'::jsonb) FROM periods)
      )
    );
  END IF;
END;
$function$;