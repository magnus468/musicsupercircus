
DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY['works','clients','agreements','agreement_files','agreement_works','projects','project_agreements','settlements','settlement_title_mappings'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public full access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Public full access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
