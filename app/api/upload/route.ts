import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/upload.server';
import type { StorageBucket } from '@/lib/storage/types';
import { StorageAuthError, StorageConfigError, StorageUploadError } from '@/lib/storage/errors';

export async function POST(request: NextRequest) {
    try {
        console.log('[Upload API] Request received');

        const formData = await request.formData();

        const file = formData.get('file') as File;
        const bucket = formData.get('bucket') as StorageBucket;
        const filename = formData.get('filename') as string | undefined;

        console.log('[Upload API] File:', file?.name, 'Bucket:', bucket);

        // Validate inputs
        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!bucket) {
            return NextResponse.json(
                { error: 'No bucket specified' },
                { status: 400 }
            );
        }

        // Validate bucket type
        const validBuckets: StorageBucket[] = ['avatars', 'files', 'screenshots'];
        if (!validBuckets.includes(bucket)) {
            return NextResponse.json(
                { error: `Invalid bucket. Must be one of: ${validBuckets.join(', ')}` },
                { status: 400 }
            );
        }

        // Upload file using the server-side upload function
        const result = await uploadFile(file, bucket, filename);

        return NextResponse.json(result);
    } catch (error) {
        // Handle specific error types
        if (error instanceof StorageAuthError) {
            return NextResponse.json(
                { error: error.message },
                { status: 401 }
            );
        }

        if (error instanceof StorageConfigError) {
            console.error('Storage configuration error:', error);
            return NextResponse.json(
                { error: 'Storage service is not properly configured. Please contact support.' },
                { status: 500 }
            );
        }

        if (error instanceof StorageUploadError) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        if (error instanceof Error) {
            // Handle validation errors (file size, type, etc.)
            if (error.message.includes('File size exceeds') ||
                error.message.includes('not allowed')) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 }
                );
            }

            console.error('Upload error:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        console.error('Unknown upload error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred during upload' },
            { status: 500 }
        );
    }
}
