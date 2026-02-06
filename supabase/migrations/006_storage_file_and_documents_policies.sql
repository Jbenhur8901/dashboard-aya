-- Migration: Storage and documents policies for Easy Sante PDF
-- Run in Supabase SQL Editor (or via migrations)

-- Storage bucket "file" policies
DROP POLICY IF EXISTS "File bucket: active users can read" ON storage.objects;
DROP POLICY IF EXISTS "File bucket: active users can upload" ON storage.objects;

CREATE POLICY "File bucket: active users can read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'file' AND public.is_active_user()
);

CREATE POLICY "File bucket: active users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'file' AND public.is_active_user()
);

-- Documents insert policy
DROP POLICY IF EXISTS "Documents: Active users can insert" ON public.documents;

CREATE POLICY "Documents: Active users can insert"
  ON public.documents FOR INSERT
  WITH CHECK (public.is_active_user());
