'use client';

import { useEffect, useState } from 'react';
import { Menu } from './menu';
import { QueueMonitor } from './queue-monitor';
import { QueueMonitorProvider } from '@/providers/queue-monitor';

type TopRightClientProps = {
    userId: string;
    projectId: string;
};

export function TopRightClient({ userId, projectId }: TopRightClientProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="absolute top-16 right-0 left-0 z-[50] m-4 flex items-center gap-2 sm:top-0 sm:left-auto">
                <div className="flex items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
                    <div className="h-8 w-8" />
                </div>
            </div>
        );
    }

    return (
        <QueueMonitorProvider userId={userId} projectId={projectId}>
            <div className="absolute top-16 right-0 left-0 z-[50] m-4 flex items-center gap-2 sm:top-0 sm:left-auto">
                <div className="flex items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
                    <QueueMonitor userId={userId} projectId={projectId} />
                    <Menu />
                </div>
            </div>
        </QueueMonitorProvider>
    );
}
