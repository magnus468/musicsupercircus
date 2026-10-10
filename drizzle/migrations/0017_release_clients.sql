CREATE TABLE public.release_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_key text NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('artist','composer','producer','customer')),
  auto boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (album_key, client_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_clients TO authenticated;
GRANT ALL ON public.release_clients TO service_role;
ALTER TABLE public.release_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage release clients" ON public.release_clients FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));