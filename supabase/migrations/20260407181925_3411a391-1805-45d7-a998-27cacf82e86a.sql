
CREATE OR REPLACE FUNCTION public.get_settlement_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    FROM base GROUP BY work_title ORDER BY sum(amount) DESC LIMIT 20
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
    'uniqueCountries', (SELECT unique_countries FROM unique_counts)
  );
$$;
