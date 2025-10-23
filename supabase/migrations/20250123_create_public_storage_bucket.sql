-- Create public storage bucket for household images and user avatars
-- This bucket stores publicly accessible images with file size and type restrictions

-- Insert the public bucket (Supabase buckets are stored in storage.buckets table)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public',
  'public',
  true, -- Make bucket public so files are accessible via public URLs
  5242880, -- 5MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] -- Only allow images
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Create storage policies for the public bucket
-- Policy 1: Anyone can view/download files (since bucket is public)
CREATE POLICY "Public bucket files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'public');

-- Policy 2: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload to public bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public'
  AND auth.role() = 'authenticated'
);

-- Policy 3: Users can update their own uploaded files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'public'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own uploaded files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Note: Files should be organized by user ID or household ID in subfolders
-- Example paths:
--   - household-covers/{timestamp}_{user_id}.jpg
--   - user-avatars/{user_id}/{timestamp}.jpg
