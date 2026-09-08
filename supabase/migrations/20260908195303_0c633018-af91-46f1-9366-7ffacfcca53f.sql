ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS statement_label text;
CREATE INDEX IF NOT EXISTS settlements_statement_label_idx ON public.settlements (publisher, statement_label);