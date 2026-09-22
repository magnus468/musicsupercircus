CREATE TABLE IF NOT EXISTS public.settlement_stats_version (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  version bigint NOT NULL DEFAULT 1
);
INSERT INTO public.settlement_stats_version (id, version) VALUES (true, 1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.settlement_stats_version ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.settlement_stats_version TO authenticated;
GRANT ALL ON public.settlement_stats_version TO service_role;

ALTER TABLE public.settlement_stats_cache ADD COLUMN IF NOT EXISTS version bigint;

CREATE OR REPLACE FUNCTION public.invalidate_settlement_stats_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.settlement_stats_version SET version = version + 1 WHERE id;
  DELETE FROM public.settlement_stats_cache WHERE true;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_settlement_stats(p_distribution_key text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_payload jsonb;
  v_version_before bigint;
  v_version_after bigint;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_key := coalesce(p_distribution_key, '__all__');

  SELECT payload INTO v_payload FROM public.settlement_stats_cache WHERE cache_key = v_key;
  IF v_payload IS NOT NULL THEN
    RETURN v_payload;
  END IF;

  SELECT version INTO v_version_before FROM public.settlement_stats_version WHERE id;

  v_payload := public.compute_settlement_stats(p_distribution_key);

  SELECT version INTO v_version_after FROM public.settlement_stats_version WHERE id;

  -- Only store the snapshot if no settlement write happened while computing it.
  IF v_version_before IS NOT DISTINCT FROM v_version_after THEN
    INSERT INTO public.settlement_stats_cache (cache_key, payload, updated_at, version)
    VALUES (v_key, v_payload, now(), v_version_after)
    ON CONFLICT (cache_key) DO UPDATE
      SET payload = EXCLUDED.payload,
          updated_at = now(),
          version = EXCLUDED.version
      WHERE public.settlement_stats_cache.version IS NULL
         OR public.settlement_stats_cache.version <= EXCLUDED.version;
  END IF;

  RETURN v_payload;
END;
$$;