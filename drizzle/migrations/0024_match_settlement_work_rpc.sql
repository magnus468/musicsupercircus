CREATE OR REPLACE FUNCTION public.match_settlement_work(p_old_title text, p_new_title text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '120s'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(p_old_title), '') = '' OR coalesce(btrim(p_new_title), '') = '' THEN
    RAISE EXCEPTION 'title required';
  END IF;

  UPDATE public.settlements
     SET work_title = p_new_title
   WHERE lower(btrim(work_title)) = lower(btrim(p_old_title));
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.settlement_title_mappings (settlement_title, work_title)
  VALUES (btrim(p_old_title), p_new_title)
  ON CONFLICT (settlement_title) DO UPDATE SET work_title = EXCLUDED.work_title;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.match_settlement_work(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_settlement_work(text, text) TO authenticated, service_role;