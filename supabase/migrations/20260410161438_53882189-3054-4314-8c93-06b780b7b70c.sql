CREATE OR REPLACE FUNCTION public.get_country_works(p_country text, p_distribution_key text DEFAULT NULL::text, p_year text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH selected_keys AS (
    SELECT unnest(string_to_array(p_distribution_key, ',')) AS key
    WHERE p_distribution_key IS NOT NULL
  ),
  base AS (
    SELECT work_title, amount, distribution, composers
    FROM public.settlements
    WHERE country = p_country
      AND (p_distribution_key IS NULL OR distribution_key IN (SELECT key FROM selected_keys))
      AND (p_year IS NULL OR substring(distribution FROM '\d{4}') = p_year)
  ),
  years AS (
    SELECT DISTINCT substring(distribution FROM '\d{4}') AS yr
    FROM public.settlements
    WHERE country = p_country
      AND distribution IS NOT NULL
      AND (p_distribution_key IS NULL OR distribution_key IN (SELECT key FROM selected_keys))
      AND substring(distribution FROM '\d{4}') IS NOT NULL
    ORDER BY yr DESC
  ),
  by_work AS (
    SELECT work_title, sum(amount) AS total, count(*)::int AS row_count, max(composers) AS composers
    FROM base
    GROUP BY work_title
    ORDER BY sum(amount) DESC
  )
  SELECT jsonb_build_object(
    'works', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'title', work_title,
      'total', total,
      'count', row_count,
      'composers', composers
    )), '[]'::jsonb) FROM by_work),
    'years', (SELECT coalesce(jsonb_agg(yr), '[]'::jsonb) FROM years)
  );
$function$;