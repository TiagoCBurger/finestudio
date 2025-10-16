import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
    StorageProvider,
    StorageBucket,
    UploadOptions,
    UploadResult,
} from './types';
import { StorageConfigError, StorageUploadError } from './errors';

class R2StorageProvider implements StorageProvider {
    private client: S3Client | null = null;
    private bucketName: string | null = null;
    private publicUrl?: string;
    private initialized = false;

    private initialize() {
        // Only initialize once
        if (this.initialized) {
            return;
        }

        // Ensure we're on the server side
        if (typeof window !== 'undefined') {
            throw new StorageConfigError(
                'R2 storage can only be used on the server side',
                'r2'
            );
        }

        // Validate required environment variables
        if (!process.env.R2_ACCOUNT_ID) {
            throw new StorageConfigError('R2_ACCOUNT_ID is not defined', 'r2');
        }
        if (!process.env.R2_ACCESS_KEY_ID) {
            throw new StorageConfigError('R2_ACCESS_KEY_ID is not defined', 'r2');
        }
        if (!process.env.R2_SECRET_ACCESS_KEY) {
            throw new StorageConfigError('R2_SECRET_ACCESS_KEY is not defined', 'r2');
        }
        if (!process.env.R2_BUCKET_NAME) {
            throw new StorageConfigError('R2_BUCKET_NAME is not defined', 'r2');
        }

        this.bucketName = process.env.R2_BUCKET_NAME;
        this.publicUrl = process.env.R2_PUBLIC_URL;

        try {
            // Initialize S3Client for R2
            this.client = new S3Client({
                region: 'auto',
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: process.env.R2_ACCESS_KEY_ID,
                    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
                },
                // Use path-style URLs instead of virtual-hosted-style
                // This generates: account-id.r2.cloudflarestorage.com/bucket/key
                // Instead of: bucket.account-id.r2.cloudflarestorage.com/key
                forcePathStyle: true,
            });
            this.initialized = true;
        } catch (error) {
            throw new StorageConfigError(
                `Failed to initialize R2 client: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'r2'
            );
        }
    }

    async upload(
        userId: string,
        bucket: StorageBucket,
        filename: string,
        file: File | Buffer | Uint8Array,
        options: UploadOptions
    ): Promise<UploadResult> {
        // Initialize on first use
        this.initialize();

        if (!this.client || !this.bucketName) {
            throw new StorageConfigError('R2 client not initialized', 'r2');
        }

        try {
            // Build the key with bucket prefix and user organization
            const key = `${bucket}/${userId}/${filename}`;

            // Convert File to Buffer if needed
            let body: Buffer | Uint8Array;
            if (file instanceof File) {
                const arrayBuffer = await file.arrayBuffer();
                body = Buffer.from(arrayBuffer);
            } else {
                body = file;
            }

            // Upload to R2
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: body,
                ContentType: options.contentType,
            });

            await this.client.send(command);

            // Generate URL based on configuration
            let url: string;

            if (this.publicUrl) {
                // Use public URL if configured and bucket has public access enabled
                url = `${this.publicUrl}/${key}`;
            } else {
                // Generate a signed URL (works without public access)
                // Valid for 7 days (604800 seconds)
                const getCommand = new GetObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                });
                url = await getSignedUrl(this.client, getCommand, {
                    expiresIn: 604800 // 7 days
                });
            }

            return {
                url,
                type: options.contentType,
            };
        } catch (error) {
            if (error instanceof Error) {
                // Check for specific error types
                if (error.name === 'NoSuchBucket') {
                    throw new StorageUploadError(
                        `Bucket '${this.bucketName}' does not exist`,
                        'r2',
                        error
                    );
                }
                if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
                    throw new StorageUploadError(
                        'Invalid R2 credentials',
                        'r2',
                        error
                    );
                }
                if (error.name === 'RequestTimeout' || error.message.includes('timeout')) {
                    throw new StorageUploadError(
                        'Upload timed out',
                        'r2',
                        error
                    );
                }
                throw new StorageUploadError(
                    `Failed to upload file to R2: ${error.message}`,
                    'r2',
                    error
                );
            }
            throw new StorageUploadError(
                'Failed to upload file to R2: Unknown error',
                'r2'
            );
        }
    }
}

export const r2Storage = new R2StorageProvider();
