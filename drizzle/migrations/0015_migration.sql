create table public.work_registrations (
  id uuid primary key default gen_random_uuid(),
  work_id uuid references public.works(id) on delete set null,
  title text not null,
  alt_title text,
  duration text,
  artist text,
  work_type text,
  creators jsonb not null default '[]',
  publishers jsonb not null default '[]',
  folder text,
  file_name text,
  pdf_path text unique,
  match_status text not null default 'unmatched' check (match_status in ('matched','uncertain','unmatched')),
  match_note text,
  share_mismatch boolean not null default false,
  mismatch_note text,
  created_at timestamptz not null default now()
);
create index on public.work_registrations(work_id);
grant select, insert, update, delete on public.work_registrations to authenticated;
grant all on public.work_registrations to service_role;
alter table public.work_registrations enable row level security;
create policy "Staff full access work_registrations" on public.work_registrations for all to authenticated using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "Staff read work registration pdfs" on storage.objects for select to authenticated using (bucket_id = 'work-registrations' and is_staff(auth.uid()));
create policy "Staff manage work registration pdfs" on storage.objects for all to authenticated using (bucket_id = 'work-registrations' and is_staff(auth.uid())) with check (bucket_id = 'work-registrations' and is_staff(auth.uid()));