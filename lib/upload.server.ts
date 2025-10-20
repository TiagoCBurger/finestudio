/**
 * Server-side upload function
 * 
 * This function is used by API routes and server actions.
 * It validates authentication using the server-side Supabase client.
 */

import { nanoid } from 'nanoid';
import { createClient } from './supabase/server';
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
    // Validate authentication using server-side client
    console.log('[Upload Server] Creating Supabase client...');
    const client = await createClient();

    console.log('[Upload Server] Getting user...');
    const { data, error } = await client.auth.getUser();

    console.log('[Upload Server] Auth result:', {
        hasUser: !!data?.user,
        userId: data?.user?.id,
        error: error?.message
    });

    if (!data?.user) {
        console.error('[Upload Server] No user found - throwing auth error');
        throw new StorageAuthError('You need to be logged in to upload a file!', 'upload');
    }

    console.log('[Upload Server] User authenticated:', data.user.id);

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

    // Get the R2 storage provider
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
