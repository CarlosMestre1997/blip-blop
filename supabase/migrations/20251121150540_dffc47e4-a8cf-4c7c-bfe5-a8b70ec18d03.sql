-- Add DELETE policy to downloads table to allow users to manage their own download history
CREATE POLICY "Users can delete their own downloads"
  ON public.downloads
  FOR DELETE
  USING (auth.uid() = user_id);