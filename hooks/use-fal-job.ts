import { useEffect, useState } from 'react';

export interface FalJobStatus {
    id: string;
    requestId: string;
    status: 'pending' | 'completed' | 'failed';
    result?: any;
    error?: string;
    createdAt: string;
    completedAt?: string;
}

export function useFalJob(requestId: string | null) {
    const [job, setJob] = useState<FalJobStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!requestId) return;

        let intervalId: NodeJS.Timeout;
        let mounted = true;

        const pollJobStatus = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/fal-jobs/${requestId}`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const jobData = await response.json();

                console.log('Polling job status:', {
                    requestId,
                    status: jobData.status,
                    hasResult: !!jobData.result,
                    resultPreview: jobData.result ? JSON.stringify(jobData.result).substring(0, 100) : null,
                });

                if (mounted) {
                    setJob(jobData);
                    setError(null);

                    // Parar polling se job completou ou falhou
                    if (jobData.status === 'completed' || jobData.status === 'failed') {
                        console.log('Job finished, stopping polling:', jobData.status);
                        clearInterval(intervalId);
                        setLoading(false);
                    }
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                    setLoading(false);
                }
            }
        };

        // Fazer polling a cada 2 segundos
        intervalId = setInterval(pollJobStatus, 2000);

        // Fazer primeira verificação imediatamente
        pollJobStatus();

        return () => {
            mounted = false;
            clearInterval(intervalId);
        };
    }, [requestId]);

    return { job, loading, error };
}