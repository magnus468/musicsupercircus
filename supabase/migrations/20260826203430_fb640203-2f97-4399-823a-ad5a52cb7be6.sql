CREATE POLICY "Authenticated can read audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'audio');
CREATE POLICY "Authenticated can upload audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio');
CREATE POLICY "Authenticated can update audio" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'audio');
CREATE POLICY "Authenticated can delete audio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'audio');