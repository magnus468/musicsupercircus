CREATE POLICY "Authenticated users can update agreements files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'agreements');

CREATE POLICY "Authenticated users can read agreements files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'agreements');

CREATE POLICY "Authenticated users can delete agreements files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'agreements');