/**
 * Loading Image Component
 * 
 * Shown while image is being loaded from storage.
 * Displays a skeleton while the actual image loads in the background.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2Icon } from 'lucide-react';

interface LoadingImageProps {
    aspectRatio?: string;
}

export function LoadingImage({ aspectRatio = '1/1' }: LoadingImageProps) {
    return (
        <Skeleton
            className="flex w-full animate-pulse items-center justify-center rounded-b-xl"
            style={{ aspectRatio }}
        >
            <div className="flex flex-col items-center gap-2">
                <Loader2Icon
                    size={16}
                    className="size-4 animate-spin text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">Loading image...</p>
            </div>
        </Skeleton>
    );
}
