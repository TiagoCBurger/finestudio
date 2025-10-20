import { createClient } from '@/lib/supabase/server';
import type {
    StorageProvider,
    StorageBucket,
    UploadOptions,
    UploadResult,
} from './types';
import { StorageConfigError, StorageUploadError } from './errors';

class SupabaseStorageProvider implements StorageProvider {
    async upload(
        userId: string,
        bucket: StorageBucket,
        filename: string,
        file: File | Buffer | Uint8Array,
        options: UploadOptions
    ): Promise<UploadResult> {
        try {
            const client = await createClient();

            // Convert File to Buffer if needed
            let body: Buffer | Uint8Array;
            if (file instanceof File) {
                const arrayBuffer = await file.arrayBuffer();
                body = Buffer.from(arrayBuffer);
            } else {
                body = file;
            }

            // Build the path with user organization
            const path = `${userId}/${filename}`;

            // Upload to Supabase Storage
            const { data, error } = await client.storage
                .from(bucket)
                .upload(path, body, {
                    contentType: options.contentType,
                    upsert: options.upsert,
                });

            if (error) {
                throw new StorageUploadError(
                    `Failed to upload to Supabase: ${error.message}`,
                    'supabase',
                    error
                );
            }

            // Get public URL
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
            throw new StorageUploadError(
                `Failed to upload file to Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'supabase',
                error instanceof Error ? error : undefined
            );
        }
    }
}

export const supabaseStorage = new SupabaseStorageProvider();
