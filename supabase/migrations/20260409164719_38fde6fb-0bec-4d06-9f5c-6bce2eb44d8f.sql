CREATE POLICY "Authenticated users can update settlements"
ON public.settlements
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);