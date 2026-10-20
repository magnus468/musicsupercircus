CREATE TABLE public.review_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  item_key text NOT NULL,
  dismissed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_dismissals TO authenticated;
GRANT ALL ON public.review_dismissals TO service_role;
ALTER TABLE public.review_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage review dismissals" ON public.review_dismissals
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));