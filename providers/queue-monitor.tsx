'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useQueueMonitor, type FalJob } from '@/hooks/use-queue-monitor';

interface QueueMonitorContextValue {
    addJobOptimistically: (job: FalJob) => void;
    activeCount: number;
    jobs: FalJob[];
    isLoading: boolean;
    error: Error | null;
    isConnected: boolean;
    refresh: () => Promise<void>;
    removeJob: (jobId: string) => void;
    clearCompleted: () => void;
    clearFailed: () => void;
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
            activeCount: 0,
            jobs: [],
            isLoading: false,
            error: null,
            isConnected: false,
            refresh: async () => { },
            removeJob: () => { },
            clearCompleted: () => { },
            clearFailed: () => { },
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
    const queueMonitor = useQueueMonitor({
        userId,
        projectId,
        enabled: true
    });

    // [DEBUG] Log provider render
    console.log('🔄 [QueueMonitorProvider] Rendering:', {
        userId,
        projectId,
        jobCount: queueMonitor.jobs.length,
        activeCount: queueMonitor.activeCount,
        isConnected: queueMonitor.isConnected,
    });

    return (
        <QueueMonitorContext.Provider value={queueMonitor}>
            {children}
        </QueueMonitorContext.Provider>
    );
}
