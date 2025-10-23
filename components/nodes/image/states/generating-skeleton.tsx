/**
 * Generating Skeleton Component
 * 
 * Shown while image is being generated (webhook pending).
 * Displays a loading skeleton with animation.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2Icon } from 'lucide-react';

interface GeneratingSkeletonProps {
    aspectRatio?: string;
    requestId?: string;
}

export function GeneratingSkeleton({
    aspectRatio = '1/1',
    requestId,
}: GeneratingSkeletonProps) {
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
                <p className="text-xs text-muted-foreground">Generating...</p>
                {requestId && process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-muted-foreground/50">
                        ID: {requestId.substring(0, 8)}
                    </p>
                )}
            </div>
        </Skeleton>
    );
}
