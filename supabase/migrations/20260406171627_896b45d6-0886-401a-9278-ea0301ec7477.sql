
-- Create agreement_files table for multiple documents per agreement
CREATE TABLE public.agreement_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agreement_files ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view agreement_files"
  ON public.agreement_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert agreement_files"
  ON public.agreement_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete agreement_files"
  ON public.agreement_files FOR DELETE TO authenticated USING (true);

-- Migrate existing file data from agreements table
INSERT INTO public.agreement_files (agreement_id, file_path, file_name)
SELECT id, file_path, COALESCE(file_name, file_path)
FROM public.agreements
WHERE file_path IS NOT NULL;
