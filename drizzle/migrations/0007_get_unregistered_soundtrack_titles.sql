CREATE OR REPLACE FUNCTION public.norm_title(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(translate(lower(trim(both '"' from trim(coalesce(t,'')))), 'åäöéèêüáàíóú’''', 'aaoeeeuaaiou'), '\s+', ' ', 'g')
$$;

CREATE OR REPLACE FUNCTION public.get_unregistered_soundtrack_titles()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' SET statement_timeout TO '60s'
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN (
    WITH recs AS (
      SELECT r.id, r.track, r.project, r.isrc, r.composer, norm_title(r.track) k
      FROM recordings r
      WHERE r.work_id IS NULL AND coalesce(r.project,'') <> ''
        AND EXISTS (SELECT 1 FROM works w
          WHERE norm_title(w.title) = norm_title(r.project)
             OR norm_title(w.project) = norm_title(r.project)
             OR norm_title(w.project) LIKE '%' || norm_title(r.project) || '%')
    ),
    inc AS (
      SELECT norm_title(s.work_title) k, sum(s.amount) total, count(*)::int n
      FROM settlements s
      WHERE norm_title(s.work_title) IN (SELECT k FROM recs)
      GROUP BY 1
    )
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', recs.id, 'track', recs.track, 'project', recs.project, 'isrc', recs.isrc,
      'composer', recs.composer, 'income', coalesce(inc.total,0), 'income_rows', coalesce(inc.n,0)
    ) ORDER BY recs.project, recs.track), '[]'::jsonb)
    FROM recs LEFT JOIN inc ON inc.k = recs.k
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_unregistered_soundtrack_titles() TO authenticated;