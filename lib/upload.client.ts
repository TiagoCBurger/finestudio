/**
 * Client-side upload function
 * 
 * This function is used by client components to upload files.
 * It calls the server-side API route which handles the actual storage upload.
 */

import type { StorageBucket } from './storage/types';

export interface UploadResult {
    url: string;
    type: string;
}

export interface UploadError {
    error: string;
}

/**
 * Upload a file from the client side
 * 
 * @param file - File to upload
 * @param bucket - Storage bucket (avatars, files, screenshots)
 * @param filename - Optional custom filename
 * @returns Upload result with URL and content type
 * @throws Error if upload fails
 */
export async function uploadFile(
    file: File,
    bucket: StorageBucket,
    filename?: string
): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    if (filename) {
        formData.append('filename', filename);
    }

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
    }

    return data as UploadResult;
}
