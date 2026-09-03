CREATE OR REPLACE FUNCTION public.get_country_works(p_country text, p_distribution_key text DEFAULT NULL::text, p_year text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN (
    WITH selected_keys AS (
      SELECT
        CASE WHEN position('::' IN token) > 0 THEN split_part(token, '::', 2) ELSE token END AS key,
        CASE WHEN position('::' IN token) > 0 THEN split_part(token, '::', 1) ELSE NULL END AS pub
      FROM unnest(string_to_array(p_distribution_key, ',')) AS token
      WHERE p_distribution_key IS NOT NULL
    ),
    base AS (
      SELECT work_title, amount, distribution, composers
      FROM public.settlements s
      WHERE country = p_country
        AND (
          p_distribution_key IS NULL
          OR EXISTS (
            SELECT 1 FROM selected_keys k
            WHERE s.distribution_key = k.key
              AND (k.pub IS NULL OR s.publisher = k.pub)
          )
        )
        AND (p_year IS NULL OR substring(distribution FROM '\\d{4}') = p_year)
    ),
    years AS (
      SELECT DISTINCT substring(distribution FROM '\\d{4}') AS yr
      FROM public.settlements s
      WHERE country = p_country
        AND distribution IS NOT NULL
        AND (
          p_distribution_key IS NULL
          OR EXISTS (
            SELECT 1 FROM selected_keys k
            WHERE s.distribution_key = k.key
              AND (k.pub IS NULL OR s.publisher = k.pub)
          )
        )
        AND substring(distribution FROM '\\d{4}') IS NOT NULL
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
    )
  );
END;
$function$;