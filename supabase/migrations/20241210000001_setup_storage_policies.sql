-- Migration: Setup Storage Bucket and Policies
-- Created: 2024-12-10
-- Description: Creates files bucket and RLS policies for image uploads

-- Create files bucket (public for easy access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'files', 
  'files', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/mpeg', 'audio/wav']
) ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/mpeg', 'audio/wav'];

-- RLS is already enabled on storage.objects by default

-- Policy: Allow public read access to all files
CREATE POLICY "Public read access for files bucket" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'files');

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'files' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow users to update their own files
CREATE POLICY "Users can update own files" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to delete their own files
CREATE POLICY "Users can delete own files" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);