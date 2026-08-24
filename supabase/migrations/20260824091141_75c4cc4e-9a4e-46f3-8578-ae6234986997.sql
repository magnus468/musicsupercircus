REVOKE EXECUTE ON FUNCTION public.get_settlement_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_settlement_stats(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_unmatched_settlement_works() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_country_works(text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_settlement_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_settlement_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unmatched_settlement_works() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_country_works(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_unmatched_settlement_works()
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
    WITH unmatched AS (
      SELECT
        s.work_title,
        sum(s.amount) AS total_amount,
        count(*)::int AS row_count,
        max(s.composers) AS composers
      FROM public.settlements s
      LEFT JOIN public.works w ON lower(trim(s.work_title)) = lower(trim(w.title))
      WHERE w.id IS NULL
      GROUP BY s.work_title
      ORDER BY sum(s.amount) DESC
    )
    SELECT coalesce(
      jsonb_agg(jsonb_build_object(
        'work_title', work_title,
        'total_amount', total_amount,
        'row_count', row_count,
        'composers', composers
      )),
      '[]'::jsonb
    )
    FROM unmatched
  );
END;
$function$;

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
    )
  );
END;
$function$;