/**
 * Error Display Component
 * 
 * Shown when image generation fails.
 * Displays error message and retry button if applicable.
 */

import { Button } from '@/components/ui/button';
import { AlertCircleIcon, RotateCcwIcon } from 'lucide-react';

interface ErrorDisplayProps {
    error: string;
    canRetry: boolean;
    aspectRatio?: string;
    onRetry?: () => void;
}

export function ErrorDisplay({
    error,
    canRetry,
    aspectRatio = '1/1',
    onRetry,
}: ErrorDisplayProps) {
    return (
        <div
            className="flex w-full flex-col items-center justify-center gap-3 rounded-b-xl bg-destructive/10 p-4"
            style={{ aspectRatio }}
        >
            <AlertCircleIcon className="size-8 text-destructive" />
            <div className="text-center">
                <p className="text-sm font-medium text-destructive">
                    Generation Failed
                </p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            {canRetry && onRetry && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    className="mt-2"
                >
                    <RotateCcwIcon size={12} className="mr-2" />
                    Retry
                </Button>
            )}
        </div>
    );
}
