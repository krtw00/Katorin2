-- Storage buckets for file uploads

-- Create bucket for tournament entry custom field images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entry-images',
  'entry-images',
  true,  -- Public bucket for easy access
  3145728,  -- 3MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create bucket for tournament cover images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tournament-covers',
  'tournament-covers',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create bucket for team avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-avatars',
  'team-avatars',
  true,
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- RLS policies for entry-images bucket
-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload entry images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'entry-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public to view entry images
CREATE POLICY "Entry images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'entry-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own entry images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'entry-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for tournament-covers bucket
CREATE POLICY "Users can upload tournament covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tournament-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Tournament covers are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tournament-covers');

CREATE POLICY "Users can delete their own tournament covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tournament-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for team-avatars bucket
CREATE POLICY "Users can upload team avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Team avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'team-avatars');

CREATE POLICY "Users can delete their own team avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for avatars bucket
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
