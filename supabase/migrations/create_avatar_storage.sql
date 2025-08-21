-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'avatars',
  'avatars', 
  true,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  2097152 -- 2MB limit
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for avatars bucket
CREATE POLICY "Users can view all avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to clean up user avatars on account deletion
CREATE OR REPLACE FUNCTION delete_user_avatar()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete avatar from storage (try both extensions)
  DELETE FROM storage.objects 
  WHERE bucket_id = 'avatars' 
  AND (name = OLD.id::text || '/avatar.png' OR name = OLD.id::text || '/avatar.jpg');
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to clean up avatars when user is deleted
DROP TRIGGER IF EXISTS on_user_delete_avatar ON public.users;
CREATE TRIGGER on_user_delete_avatar
  BEFORE DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION delete_user_avatar();

-- Function to check if user has avatar
CREATE OR REPLACE FUNCTION has_avatar(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.users 
    WHERE id = user_id 
    AND avatar_url IS NOT NULL 
    AND avatar_url != ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;