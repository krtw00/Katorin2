-- Storage buckets for file uploads

-- Create bucket for tournament entry custom field images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entry-images',
  'entry-images',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for tournament cover images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tournament-covers',
  'tournament-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for team avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-avatars',
  'team-avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for entry-images bucket
-- Allow authenticated users to upload their own images
DROP POLICY IF EXISTS "Users can upload entry images" ON storage.objects;
CREATE POLICY "Users can upload entry images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'entry-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public to view entry images
DROP POLICY IF EXISTS "Entry images are publicly accessible" ON storage.objects;
CREATE POLICY "Entry images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'entry-images');

-- Allow users to delete their own images
DROP POLICY IF EXISTS "Users can delete their own entry images" ON storage.objects;
CREATE POLICY "Users can delete their own entry images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'entry-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for tournament-covers bucket
DROP POLICY IF EXISTS "Users can upload tournament covers" ON storage.objects;
CREATE POLICY "Users can upload tournament covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tournament-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Tournament covers are publicly accessible" ON storage.objects;
CREATE POLICY "Tournament covers are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tournament-covers');

DROP POLICY IF EXISTS "Users can delete their own tournament covers" ON storage.objects;
CREATE POLICY "Users can delete their own tournament covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tournament-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for team-avatars bucket
DROP POLICY IF EXISTS "Users can upload team avatars" ON storage.objects;
CREATE POLICY "Users can upload team avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Team avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Team avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'team-avatars');

DROP POLICY IF EXISTS "Users can delete their own team avatars" ON storage.objects;
CREATE POLICY "Users can delete their own team avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
