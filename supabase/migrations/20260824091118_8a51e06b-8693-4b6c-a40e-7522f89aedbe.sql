-- Role infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'staff')
  )
$$;

-- Preserve access for all existing accounts
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'staff'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- Lock down clients
DROP POLICY IF EXISTS "Authenticated full access" ON public.clients;
CREATE POLICY "Staff can view clients"
ON public.clients FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update clients"
ON public.clients FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete clients"
ON public.clients FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

-- Lock down settlements
DROP POLICY IF EXISTS "Authenticated full access" ON public.settlements;
CREATE POLICY "Staff can view settlements"
ON public.settlements FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert settlements"
ON public.settlements FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update settlements"
ON public.settlements FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete settlements"
ON public.settlements FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));