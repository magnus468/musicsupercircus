CREATE INDEX IF NOT EXISTS settlements_composers_trgm_idx ON public.settlements USING gin (composers gin_trgm_ops);
CREATE INDEX IF NOT EXISTS settlements_country_trgm_idx ON public.settlements USING gin (country gin_trgm_ops);
CREATE INDEX IF NOT EXISTS settlements_source_trgm_idx ON public.settlements USING gin (source gin_trgm_ops);
CREATE INDEX IF NOT EXISTS settlements_production_title_trgm_idx ON public.settlements USING gin (production_title gin_trgm_ops);