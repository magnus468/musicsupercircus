
DO $$
DECLARE
  t text;
  p record;
  tables text[] := ARRAY['works','clients','agreements','agreement_files','agreement_works','projects','project_agreements','settlements','settlement_title_mappings'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop all existing policies on the table
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    -- Revoke anon access
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);

    -- Ensure authenticated + service_role grants
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);

    -- Ensure RLS enabled
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Authenticated-only full access policy
    EXECUTE format($f$CREATE POLICY "Authenticated full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)$f$, t);
  END LOOP;
END $$;
