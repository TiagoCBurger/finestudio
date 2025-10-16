/**
 * Supabase Storage Provider
 * 
 * Implements the StorageProvider interface using Supabase Storage.
 * This provider maintains compatibility with the existing Supabase storage implementation.
 */

import { createClient } from '@/lib/supabase/client';
import type { StorageProvider, StorageBucket, UploadOptions, UploadResult } from './types';
import { StorageUploadError } from './errors';

/**
 * Supabase Storage Provider Implementation
 * 
 * Uses Supabase Storage for file uploads with the same behavior as the original implementation.
 */
class SupabaseStorageProvider implements StorageProvider {
    /**
     * Upload a file to Supabase Storage
     * 
     * @param userId - User ID for organizing files in the bucket
     * @param bucket - Storage bucket name (avatars, files, screenshots)
     * @param filename - Name of the file to upload
     * @param file - File data (File, Buffer, or Uint8Array)
     * @param options - Upload options including contentType and upsert behavior
     * @returns Upload result with public URL and content type
     * @throws Error if upload fails
     */
    async upload(
        userId: string,
        bucket: StorageBucket,
        filename: string,
        file: File | Buffer | Uint8Array,
        options: UploadOptions
    ): Promise<UploadResult> {
        try {
            const client = createClient();

            // Convert Buffer/Uint8Array to File if needed
            let fileToUpload: File;
            if (file instanceof File) {
                fileToUpload = file;
            } else {
                // Convert Buffer to Uint8Array if needed, then create File
                const uint8Array = file instanceof Buffer
                    ? new Uint8Array(file.buffer, file.byteOffset, file.byteLength)
                    : file;
                fileToUpload = new File([uint8Array as BlobPart], filename, {
                    type: options.contentType,
                });
            }

            // Upload to Supabase Storage with path structure: {userId}/{filename}
            const { data, error } = await client.storage
                .from(bucket)
                .upload(`${userId}/${filename}`, fileToUpload, {
                    contentType: options.contentType,
                    upsert: options.upsert,
                });

            if (error) {
                // Check for specific error types
                if (error.message.includes('not found') || error.message.includes('does not exist')) {
                    throw new StorageUploadError(
                        `Bucket '${bucket}' does not exist`,
                        'supabase',
                        new Error(error.message)
                    );
                }
                if (error.message.includes('permission') || error.message.includes('unauthorized')) {
                    throw new StorageUploadError(
                        'Permission denied: Check your Supabase storage policies',
                        'supabase',
                        new Error(error.message)
                    );
                }
                if (error.message.includes('size') || error.message.includes('too large')) {
                    throw new StorageUploadError(
                        'File size exceeds Supabase storage limits',
                        'supabase',
                        new Error(error.message)
                    );
                }
                throw new StorageUploadError(
                    `Failed to upload file to Supabase: ${error.message}`,
                    'supabase',
                    new Error(error.message)
                );
            }

            // Get public URL for the uploaded file
            const { data: urlData } = client.storage
                .from(bucket)
                .getPublicUrl(data.path);

            return {
                url: urlData.publicUrl,
                type: options.contentType,
            };
        } catch (error) {
            if (error instanceof StorageUploadError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new StorageUploadError(
                    `Failed to upload file to Supabase: ${error.message}`,
                    'supabase',
                    error
                );
            }
            throw new StorageUploadError(
                'Failed to upload file to Supabase: Unknown error',
                'supabase'
            );
        }
    }
}

/**
 * Singleton instance of the Supabase storage provider
 * 
 * Export a single instance to be reused across the application.
 */
export const supabaseStorage = new SupabaseStorageProvider();
