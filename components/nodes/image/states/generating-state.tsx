/**
 * Estado Generating - Gerando imagem via API
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2Icon } from 'lucide-react';

interface GeneratingStateProps {
    aspectRatio: string;
    requestId?: string;
}

export function GeneratingState({ aspectRatio, requestId }: GeneratingStateProps) {
    return (
        <Skeleton
            className="flex w-full animate-pulse items-center justify-center rounded-b-xl"
            style={{ aspectRatio }}
        >
            <div className="flex flex-col items-center gap-2">
                <Loader2Icon size={16} className="size-4 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Generating...</p>
                {requestId && (
                    <p className="text-[10px] text-muted-foreground/50 font-mono">
                        {requestId.substring(0, 8)}
                    </p>
                )}
            </div>
        </Skeleton>
    );
}
