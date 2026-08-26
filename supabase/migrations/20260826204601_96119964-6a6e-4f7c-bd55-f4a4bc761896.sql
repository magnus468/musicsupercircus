ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS cover_url text;

CREATE POLICY "Authenticated can read covers" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'covers');
CREATE POLICY "Authenticated can upload covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers');
CREATE POLICY "Authenticated can update covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'covers');
CREATE POLICY "Authenticated can delete covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'covers');