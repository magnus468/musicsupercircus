CREATE OR REPLACE FUNCTION public.get_unmatched_settlement_works()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $$
  WITH agg AS (
    SELECT
      s.work_title,
      sum(s.amount) AS total_amount,
      count(*)::int AS row_count,
      max(s.composers) AS composers
    FROM public.settlements s
    GROUP BY s.work_title
  ),
  unmatched AS (
    SELECT *
    FROM agg a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.works w
      WHERE lower(trim(w.title)) = lower(trim(a.work_title))
    )
    ORDER BY a.total_amount DESC
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
  FROM unmatched;
$$;