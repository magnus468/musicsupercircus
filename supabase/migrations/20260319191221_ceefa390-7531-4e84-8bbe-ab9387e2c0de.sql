
ALTER TABLE public.clients ADD COLUMN first_name text;
ALTER TABLE public.clients ADD COLUMN last_name text;

UPDATE public.clients SET
  first_name = split_part(name, ' ', 1),
  last_name = CASE
    WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1)
    ELSE ''
  END;

ALTER TABLE public.clients ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.clients ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE public.clients ALTER COLUMN last_name SET DEFAULT '';
ALTER TABLE public.clients DROP COLUMN name;
