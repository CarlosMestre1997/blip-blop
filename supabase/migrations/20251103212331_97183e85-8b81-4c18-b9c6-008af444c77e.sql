-- Create downloads tracking table
CREATE TABLE IF NOT EXISTS public.downloads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  download_date timestamptz NOT NULL DEFAULT now(),
  file_format text NOT NULL
);

-- Enable RLS on downloads
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Downloads policies
DROP POLICY IF EXISTS "Users can view their own downloads" ON public.downloads;
CREATE POLICY "Users can view their own downloads"
  ON public.downloads
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own downloads" ON public.downloads;
CREATE POLICY "Users can insert their own downloads"
  ON public.downloads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);