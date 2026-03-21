ALTER TABLE public.works 
  ADD COLUMN nordic_publisher_share numeric NOT NULL DEFAULT 50,
  ADD COLUMN row_publisher_share numeric NOT NULL DEFAULT 50;