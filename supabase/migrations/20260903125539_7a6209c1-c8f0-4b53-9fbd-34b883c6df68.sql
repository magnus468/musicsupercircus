ALTER TABLE public.settlements ADD COLUMN publisher text NOT NULL DEFAULT 'MSCE';
UPDATE public.settlements SET publisher = 'MSCP' WHERE distribution_key LIKE 'WC-%';
CREATE INDEX IF NOT EXISTS settlements_publisher_idx ON public.settlements (publisher);
ALTER TABLE public.settlements ADD CONSTRAINT settlements_publisher_check CHECK (publisher IN ('MSCE', 'MSCP'));