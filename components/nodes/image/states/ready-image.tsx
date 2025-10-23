/**
 * Ready Image Component
 * 
 * Shown when image is successfully generated and loaded.
 * Displays the actual image with proper error handling.
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';
import { LoadingImage } from './loading-image';

interface ReadyImageProps {
    url: string;
    timestamp: string;
    aspectRatio?: string;
    onLoadComplete?: () => void;
}

export function ReadyImage({
    url,
    timestamp,
    aspectRatio = '1/1',
    onLoadComplete,
}: ReadyImageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleLoad = () => {
        console.log('✅ Image loaded successfully:', url);
        setIsLoading(false);
        setHasError(false);
        onLoadComplete?.();
    };

    const handleError = (error: any) => {
        console.error('❌ Failed to load image:', {
            url,
            error,
            timestamp,
        });

        setIsLoading(false);
        setHasError(true);

        // Check if this is a Cloudflare R2 signed URL that might be expired
        const isR2SignedUrl =
            url.includes('r2.cloudflarestorage.com') &&
            url.includes('X-Amz-Signature');

        if (isR2SignedUrl) {
            toast.error(
                'Image URL expired - please regenerate or switch to Supabase storage'
            );
        } else {
            toast.error('Failed to load image - please try regenerating');
        }
    };

    if (hasError) {
        return (
            <div
                className="flex w-full items-center justify-center rounded-b-xl bg-destructive/10 p-4"
                style={{ aspectRatio }}
            >
                <p className="text-destructive text-sm">Failed to load image</p>
            </div>
        );
    }

    return (
        <>
            {isLoading && <LoadingImage aspectRatio={aspectRatio} />}
            <Image
                key={`${url}-${timestamp}`}
                src={url}
                alt="Generated image"
                width={1000}
                height={1000}
                className={`w-full rounded-b-xl object-cover ${isLoading ? 'hidden' : ''}`}
                onLoad={handleLoad}
                onError={handleError}
                onLoadStart={() => {
                    console.log('🔄 Starting to load image:', url);
                    setIsLoading(true);
                }}
            />
        </>
    );
}
