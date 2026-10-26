ALTER TABLE public.works ADD COLUMN IF NOT EXISTS sheet_locked boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.works.sheet_locked IS 'Catalog shares corrected manually; sheet sync must not overwrite creators/publishers until the sheet matches.';
UPDATE public.works SET sheet_locked = true WHERE updated_at >= '2026-10-26' AND updated_at < '2026-10-27';