CREATE POLICY "Staff read royalty PDFs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'royalty-statements' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff upload royalty PDFs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'royalty-statements' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update royalty PDFs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'royalty-statements' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete royalty PDFs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'royalty-statements' AND public.is_staff(auth.uid()));