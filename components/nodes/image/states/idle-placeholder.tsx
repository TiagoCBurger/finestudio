/**
 * Idle Placeholder Component
 * 
 * Shown when no image has been generated yet.
 * Displays a call-to-action to generate an image.
 */

import { PlayIcon } from 'lucide-react';

interface IdlePlaceholderProps {
    aspectRatio?: string;
}

export function IdlePlaceholder({ aspectRatio = '1/1' }: IdlePlaceholderProps) {
    return (
        <div
            className="flex w-full items-center justify-center rounded-b-xl bg-secondary p-4"
            style={{ aspectRatio }}
        >
            <p className="text-muted-foreground text-sm">
                Press <PlayIcon size={12} className="-translate-y-px inline" /> to
                create an image
            </p>
        </div>
    );
}
