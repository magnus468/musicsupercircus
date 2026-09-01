CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_settlements_distribution_key ON public.settlements (distribution_key);
CREATE INDEX IF NOT EXISTS idx_settlements_amount_desc ON public.settlements (amount DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_work_title_lower ON public.settlements (lower(btrim(work_title)));
CREATE INDEX IF NOT EXISTS idx_settlements_work_title_trgm ON public.settlements USING gin (work_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_settlements_composers_trgm ON public.settlements USING gin (composers gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_settlements_country ON public.settlements (country);
CREATE INDEX IF NOT EXISTS idx_settlements_source ON public.settlements (source);
CREATE INDEX IF NOT EXISTS idx_settlements_production_title_trgm ON public.settlements USING gin (production_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_works_title_lower ON public.works (lower(btrim(title)));

ANALYZE public.settlements;
ANALYZE public.works;