DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects','project_agreements','settlement_title_mappings','agreement_files','works','agreements','agreement_works'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated full access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Staff full access" ON public.%I FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t);
  END LOOP;
END $$;