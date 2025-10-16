import { nanoid } from 'nanoid';
import { createClient } from './supabase/client';
import { getStorageProvider } from './storage/factory';
import type { StorageBucket } from './storage/types';
import { StorageAuthError } from './storage/errors';

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Allowed content types per bucket
const allowedTypes: Record<StorageBucket, string[]> = {
  avatars: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  files: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
  ],
  screenshots: ['image/jpeg', 'image/png', 'image/webp'],
};

export const uploadFile = async (
  file: File,
  bucket: StorageBucket,
  filename?: string
) => {
  // Validate authentication
  const client = createClient();
  const { data } = await client.auth.getUser();

  if (!data?.user) {
    throw new StorageAuthError('You need to be logged in to upload a file!', 'upload');
  }

  // File size validation
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
    );
  }

  // Content type validation
  if (!allowedTypes[bucket].includes(file.type)) {
    throw new Error(
      `File type "${file.type}" is not allowed for bucket "${bucket}". Allowed types: ${allowedTypes[bucket].join(', ')}`
    );
  }

  // Generate filename if not provided
  const extension = file.name.split('.').pop();
  const name = filename ?? `${nanoid()}.${extension}`;

  // Get the configured storage provider
  // This may throw StorageConfigError if provider is not configured correctly
  const storage = getStorageProvider();

  // Upload using the selected provider
  // This may throw StorageUploadError if upload fails
  const result = await storage.upload(
    data.user.id,
    bucket,
    name,
    file,
    {
      contentType: file.type,
      upsert: bucket === 'screenshots',
    }
  );

  return result;
};
