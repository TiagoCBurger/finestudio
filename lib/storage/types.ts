/**
 * Storage Provider Types
 * 
 * Defines the common interface for all storage providers (R2, Supabase)
 * This abstraction allows switching between storage backends without code changes
 */

/**
 * Supported storage bucket types
 * - avatars: User profile pictures
 * - files: General user-uploaded files (images, videos, audio)
 * - screenshots: Project screenshots (supports upsert)
 */
export type StorageBucket = 'avatars' | 'files' | 'screenshots';

/**
 * Valid storage bucket names for runtime validation
 */
export const STORAGE_BUCKETS: readonly StorageBucket[] = ['avatars', 'files', 'screenshots'] as const;

/**
 * Type guard to check if a string is a valid StorageBucket
 */
export function isValidStorageBucket(bucket: string): bucket is StorageBucket {
    return STORAGE_BUCKETS.includes(bucket as StorageBucket);
}

/**
 * Options for uploading files to storage
 */
export interface UploadOptions {
    /** MIME type of the file being uploaded */
    contentType: string;

    /** 
     * Whether to overwrite existing files with the same name
     * Default: false (generate unique filename)
     * Note: Only applies to 'screenshots' bucket
     */
    upsert?: boolean;
}

/**
 * Result returned after a successful upload
 */
export interface UploadResult {
    /** Public URL where the file can be accessed */
    url: string;

    /** MIME type of the uploaded file */
    type: string;
}

/**
 * Storage Provider Interface
 * 
 * Common interface implemented by all storage providers (R2, Supabase)
 * Allows seamless switching between storage backends via STORAGE_PROVIDER env var
 */
export interface StorageProvider {
    /**
     * Upload a file to storage
     * 
     * @param userId - User ID for organizing files (used in path structure)
     * @param bucket - Logical bucket name (avatars, files, screenshots)
     * @param filename - Name of the file (should include extension)
     * @param file - File data to upload (File, Buffer, or Uint8Array)
     * @param options - Upload options (contentType, upsert)
     * @returns Promise resolving to upload result with public URL
     * @throws Error if upload fails or user is not authenticated
     */
    upload(
        userId: string,
        bucket: StorageBucket,
        filename: string,
        file: File | Buffer | Uint8Array,
        options: UploadOptions
    ): Promise<UploadResult>;
}
