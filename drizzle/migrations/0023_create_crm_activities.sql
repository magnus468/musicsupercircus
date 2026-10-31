create table public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  activity_type text not null default 'note',
  subject text not null,
  body text,
  activity_date date not null default current_date,
  follow_up_date date,
  status text not null default 'open',
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage CRM activities"
  ON public.crm_activities
  FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX crm_activities_client_idx ON public.crm_activities (client_id, activity_date DESC);
CREATE INDEX crm_activities_followup_idx ON public.crm_activities (status, follow_up_date) WHERE follow_up_date IS NOT NULL;