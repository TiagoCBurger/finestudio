-- Migration: Fix Storage Policies for Service Role
-- Created: 2024-12-15
-- Description: Allow service role to upload files (needed for webhooks)

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;

-- Create new policy that allows both authenticated users AND service role
CREATE POLICY "Authenticated users and service role can upload files" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'files' 
  AND (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  )
);

-- Also update the UPDATE policy to allow service role
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;

CREATE POLICY "Users and service role can update files" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'files' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.role() = 'service_role'
  )
);

-- Also update the DELETE policy to allow service role
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

CREATE POLICY "Users and service role can delete files" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'files' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.role() = 'service_role'
  )
);

-- Update file size limit to 100MB (was 10MB)
UPDATE storage.buckets 
SET file_size_limit = 104857600 -- 100MB
WHERE id = 'files';

-- Add video/webm to allowed mime types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'image/gif', 
  'video/mp4', 
  'video/webm',
  'audio/mpeg', 
  'audio/wav',
  'audio/webm'
]
WHERE id = 'files';
