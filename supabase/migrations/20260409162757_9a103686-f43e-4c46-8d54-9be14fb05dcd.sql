
CREATE OR REPLACE FUNCTION public.get_unmatched_settlement_works()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  FROM unmatched;
$$;
