import { useEffect, useRef, useState } from 'react';

export type FalJobStatus = 'pending' | 'completed' | 'failed';

export interface FalJob {
    id: string;
    requestId: string;
    status: FalJobStatus;
    result: unknown;
    error: string | null;
    createdAt: string;
    completedAt: string | null;
}

interface UseFalJobOptions {
    requestId: string | null;
    enabled?: boolean;
    pollInterval?: number;
    maxPollTime?: number;
    onCompleted?: (job: FalJob) => void;
    onFailed?: (error: string) => void;
}

export function useFalJob({
    requestId,
    enabled = true,
    pollInterval = 3000, // 3 seconds
    maxPollTime = 10 * 60 * 1000, // 10 minutes
    onCompleted,
    onFailed,
}: UseFalJobOptions) {
    const [job, setJob] = useState<FalJob | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const startTimeRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!requestId || !enabled) {
            return;
        }

        let isMounted = true;
        startTimeRef.current = Date.now();
        setIsPolling(true);
        setError(null);

        const pollJobStatus = async () => {
            try {
                // Check if we've exceeded max poll time
                const elapsed = Date.now() - startTimeRef.current;
                if (elapsed > maxPollTime) {
                    const timeoutError = `Job polling timed out after ${maxPollTime / 1000} seconds`;
                    setError(timeoutError);
                    setIsPolling(false);
                    onFailed?.(timeoutError);
                    return;
                }

                const response = await fetch(`/api/fal-jobs/${requestId}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Job not found');
                    }
                    throw new Error(`Failed to fetch job status: ${response.status}`);
                }

                const jobData: FalJob = await response.json();

                if (!isMounted) return;

                setJob(jobData);

                console.log('[useFalJob] Job status:', {
                    requestId,
                    status: jobData.status,
                    hasResult: !!jobData.result,
                    elapsed: `${Math.round(elapsed / 1000)}s`,
                });

                if (jobData.status === 'completed') {
                    setIsPolling(false);
                    onCompleted?.(jobData);
                    console.log('[useFalJob] Job completed successfully');
                } else if (jobData.status === 'failed') {
                    const failError = jobData.error || 'Job failed';
                    setError(failError);
                    setIsPolling(false);
                    onFailed?.(failError);
                    console.error('[useFalJob] Job failed:', failError);
                } else {
                    // Still pending, schedule next poll
                    timeoutRef.current = setTimeout(pollJobStatus, pollInterval);
                }
            } catch (err) {
                if (!isMounted) return;

                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                console.error('[useFalJob] Polling error:', errorMessage);
                setError(errorMessage);
                setIsPolling(false);
                onFailed?.(errorMessage);
            }
        };

        // Start polling
        pollJobStatus();

        return () => {
            isMounted = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [requestId, enabled, pollInterval, maxPollTime, onCompleted, onFailed]);

    return {
        job,
        isPolling,
        error,
        isCompleted: job?.status === 'completed',
        isFailed: job?.status === 'failed',
        isPending: job?.status === 'pending',
    };
}
