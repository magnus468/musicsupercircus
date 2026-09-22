CREATE OR REPLACE FUNCTION public.invalidate_settlement_stats_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.settlement_stats_cache WHERE true;
  RETURN NULL;
END;
$$;