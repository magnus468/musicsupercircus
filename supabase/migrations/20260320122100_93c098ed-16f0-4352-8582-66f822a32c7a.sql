ALTER TABLE public.agreements
  ADD COLUMN rolling_end_date date,
  ADD COLUMN retention_years integer;