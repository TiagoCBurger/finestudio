/**
 * Estado Idle - Aguardando input do usuário
 */

import { PlayIcon } from 'lucide-react';

interface IdleStateProps {
    aspectRatio: string;
}

export function IdleState({ aspectRatio }: IdleStateProps) {
    return (
        <div
            className="flex w-full items-center justify-center rounded-b-xl bg-secondary p-4"
            style={{ aspectRatio }}
        >
            <p className="text-muted-foreground text-sm">
                Press <PlayIcon size={12} className="-translate-y-px inline" /> to create
                an image
            </p>
        </div>
    );
}
