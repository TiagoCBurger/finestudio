'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useQueueMonitor, type FalJob } from '@/hooks/use-queue-monitor';

interface QueueMonitorContextValue {
    addJobOptimistically: (job: FalJob) => void;
    activeCount: number;
}

const QueueMonitorContext = createContext<QueueMonitorContextValue | null>(null);

export function useQueueMonitorContext() {
    const context = useContext(QueueMonitorContext);
    if (!context) {
        // Return a no-op function if context is not available
        // This allows components to work even if not wrapped in provider
        return {
            addJobOptimistically: () => {
                console.warn('QueueMonitorContext not available, job will only appear after Realtime update');
            },
            activeCount: 0
        };
    }
    return context;
}

interface QueueMonitorProviderProps {
    userId: string;
    projectId?: string;
    children: ReactNode;
}

export function QueueMonitorProvider({ userId, projectId, children }: QueueMonitorProviderProps) {
    const { addJobOptimistically, activeCount } = useQueueMonitor({
        userId,
        projectId,
        enabled: true
    });

    return (
        <QueueMonitorContext.Provider value={{ addJobOptimistically, activeCount }}>
            {children}
        </QueueMonitorContext.Provider>
    );
}
