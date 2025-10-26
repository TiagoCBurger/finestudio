'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { realtimeLogger } from '@/lib/realtime-logger';
import { toast } from 'sonner';

/**
 * Job status type
 */
export type FalJobStatus = 'pending' | 'completed' | 'failed';

/**
 * Job type from database
 */
export interface FalJob {
    id: string;
    requestId: string;
    userId?: string;
    modelId: string;
    type: 'image' | 'video';
    status: FalJobStatus;
    input: {
        prompt?: string;
        _metadata?: {
            nodeId: string;
            projectId: string;
        };
        [key: string]: any;
    } | null;
    result: {
        images?: Array<{ url: string }>;
        video?: { url: string };
        [key: string]: any;
    } | null;
    error: string | null;
    createdAt: string;
    completedAt: string | null;
}

/**
 * Broadcast payload structure for job updates
 * Note: Supabase Realtime may wrap the payload in a { payload: {...} } structure
 */
interface JobUpdatePayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    schema: string;
    new?: FalJob;
    old?: FalJob;
}

/**
 * Wrapped payload from Supabase Realtime
 */
interface RealtimePayloadWrapper {
    payload?: JobUpdatePayload;
    [key: string]: any;
}

/**
 * Hook options
 */
interface UseQueueMonitorOptions {
    userId: string;
    projectId?: string;
    enabled?: boolean;
}

/**
 * Hook return type
 */
interface UseQueueMonitorReturn {
    jobs: FalJob[];
    activeCount: number;
    isLoading: boolean;
    error: Error | null;
    isConnected: boolean;
    refresh: () => Promise<void>;
    addJobOptimistically: (job: FalJob) => void;
    removeJob: (jobId: string) => void;
    clearCompleted: () => void;
    clearFailed: () => void;
}

/**
 * Hook to monitor fal.ai job queue with real-time updates
 * 
 * Features:
 * - Fetches jobs from API on mount
 * - Subscribes to Supabase Realtime for live updates using RealtimeConnectionManager
 * - Calculates active job count (pending jobs)
 * - Provides functions to manage job list
 * - Shows toast notifications on job completion/failure
 * 
 * Uses broadcast for better scalability (recommended over postgres_changes)
 * Follows Supabase Realtime best practices with proper error handling and cleanup
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1
 */
export function useQueueMonitor({
    userId,
    projectId,
    enabled = true
}: UseQueueMonitorOptions): UseQueueMonitorReturn {
    const [jobs, setJobs] = useState<FalJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // [DEBUG] Log when jobs state changes
    useEffect(() => {
        console.log('📊 [useQueueMonitor] Jobs state changed:', {
            jobCount: jobs.length,
            jobIds: jobs.map(j => j.id),
            statuses: jobs.map(j => ({ id: j.id, status: j.status })),
            timestamp: new Date().toISOString(),
        });
    }, [jobs]);

    // Calculate active count (pending jobs)
    const activeCount = jobs.filter(job => job.status === 'pending').length;

    // Fetch jobs from API
    const fetchJobs = useCallback(async () => {
        if (!userId || !enabled) return;

        try {
            setIsLoading(true);
            setError(null);

            const url = new URL('/api/fal-jobs', window.location.origin);
            if (projectId) {
                url.searchParams.set('projectId', projectId);
            }

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Failed to fetch jobs: ${response.status}`);
            }

            const data = await response.json();
            setJobs(data.jobs || []);

            realtimeLogger.info('Jobs fetched successfully', {
                userId,
                projectId,
                count: data.jobs?.length || 0
            });
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error('Unknown error');
            setError(errorObj);
            realtimeLogger.error('Failed to fetch jobs', {
                userId,
                projectId,
                error: errorObj.message
            });
            toast.error('Falha ao carregar fila de requisições');
        } finally {
            setIsLoading(false);
        }
    }, [userId, projectId, enabled]);

    // Polling como fallback para atualizar a fila
    useEffect(() => {
        if (!enabled || !userId) return;

        // Verificar se há jobs pendentes
        const hasPendingJobs = jobs.some(job => job.status === 'pending');

        if (!hasPendingJobs) return;

        console.log('🔄 Starting queue polling - pending jobs detected');

        const pollInterval = setInterval(async () => {
            try {
                const url = new URL('/api/fal-jobs', window.location.origin);
                if (projectId) {
                    url.searchParams.set('projectId', projectId);
                }

                const response = await fetch(url.toString());
                if (!response.ok) return;

                const data = await response.json();
                const newJobs = data.jobs || [];

                // Verificar se algum job mudou de status
                const hasChanges = newJobs.some((newJob: FalJob) => {
                    const oldJob = jobs.find(j => j.id === newJob.id);
                    return oldJob && oldJob.status !== newJob.status;
                });

                if (hasChanges) {
                    console.log('✅ Polling detected job status changes');
                    setJobs(newJobs);
                }
            } catch (error) {
                console.error('❌ Queue polling error:', error);
            }
        }, 3000); // Poll a cada 3 segundos

        return () => clearInterval(pollInterval);
    }, [enabled, userId, projectId, jobs]);

    // Handle job updates from realtime
    const handleJobUpdate = useCallback((payload: any) => {
        const timestamp = new Date().toISOString();

        // [FIX] O payload do Supabase Realtime vem com estrutura diferente
        // Pode vir como: { payload: { type, new, old } } ou diretamente { type, new, old }
        const actualPayload = payload?.payload || payload;

        // [DIAGNOSTIC] Log broadcast received with full details
        console.log('🔔 [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received:', {
            timestamp,
            userId,
            rawPayload: payload,
            actualPayload,
            payloadKeys: Object.keys(payload || {}),
            actualPayloadKeys: Object.keys(actualPayload || {}),
        });

        if (!actualPayload || typeof actualPayload !== 'object') {
            console.warn('[REALTIME-DIAGNOSTIC] Invalid payload received, ignoring', {
                userId,
                payloadType: typeof actualPayload,
                timestamp,
                rawPayload: payload,
            });
            realtimeLogger.warn('Invalid payload received, ignoring', { userId, payload: typeof actualPayload });
            return;
        }

        // Extract operation type - can be "type" or "operation" depending on payload structure
        const type = actualPayload.type || actualPayload.operation;
        const newJob = actualPayload.new || actualPayload.record;
        const oldJob = actualPayload.old || actualPayload.old_record;
        const jobId = newJob?.id || oldJob?.id;

        console.log('🔔 [REALTIME-DIAGNOSTIC] Extracted data:', {
            type,
            jobId,
            oldStatus: oldJob?.status,
            newStatus: newJob?.status,
            hasNew: !!newJob,
            hasOld: !!oldJob,
            payloadKeys: Object.keys(actualPayload),
        });

        if (!type) {
            console.warn('[REALTIME-DIAGNOSTIC] No type/operation in payload, ignoring', {
                userId,
                actualPayload,
                timestamp
            });
            return;
        }

        realtimeLogger.info('Job update received', {
            userId,
            type,
            jobId
        });

        setJobs(prevJobs => {
            // [DIAGNOSTIC] Log current jobs state before update
            console.log('[REALTIME-DIAGNOSTIC] Jobs state BEFORE update:', {
                timestamp,
                userId,
                jobId,
                type,
                count: prevJobs.length,
                jobIds: prevJobs.map(j => j.id),
                statuses: prevJobs.map(j => ({ id: j.id, status: j.status })),
            });

            let updatedJobs = prevJobs;
            let wasAdded = false;
            let wasRemoved = false;
            let wasUpdated = false;
            let isDuplicate = false;

            switch (type) {
                case 'INSERT':
                    if (!newJob) {
                        console.warn('[REALTIME-DIAGNOSTIC] INSERT event without newJob', { timestamp, userId });
                        return prevJobs;
                    }

                    // [DEDUPLICATION] Check if job already exists by jobId
                    const existingById = prevJobs.find(j => j.id === newJob.id);
                    if (existingById) {
                        isDuplicate = true;
                        console.log('[DEDUPLICATION] Job already exists, updating instead of inserting:', {
                            timestamp,
                            userId,
                            jobId: newJob.id,
                            requestId: newJob.requestId,
                            existingStatus: existingById.status,
                            newStatus: newJob.status,
                            source: 'broadcast_insert',
                        });

                        // Update existing job with broadcast data (may have more complete info)
                        wasUpdated = true;
                        updatedJobs = prevJobs.map(job =>
                            job.id === newJob.id ? { ...job, ...newJob } : job
                        );
                        break;
                    }

                    // [DEDUPLICATION] Also check by requestId as fallback
                    const existingByRequestId = prevJobs.find(j => j.requestId === newJob.requestId);
                    if (existingByRequestId) {
                        isDuplicate = true;
                        console.log('[DEDUPLICATION] Job with same requestId exists, updating instead of inserting:', {
                            timestamp,
                            userId,
                            jobId: newJob.id,
                            existingJobId: existingByRequestId.id,
                            requestId: newJob.requestId,
                            source: 'broadcast_insert',
                        });

                        // Update existing job with broadcast data
                        wasUpdated = true;
                        updatedJobs = prevJobs.map(job =>
                            job.requestId === newJob.requestId ? { ...job, ...newJob, id: newJob.id } : job
                        );
                        break;
                    }

                    console.log('[DEDUPLICATION] No duplicate found, adding job from broadcast:', {
                        jobId: newJob.id,
                        requestId: newJob.requestId,
                    });

                    wasAdded = true;
                    updatedJobs = [newJob, ...prevJobs];
                    break;

                case 'UPDATE':
                    if (!newJob) {
                        console.warn('[REALTIME-DIAGNOSTIC] UPDATE event without newJob', { timestamp, userId });
                        return prevJobs;
                    }

                    // Show toast notification on status change
                    const existingJob = prevJobs.find(j => j.id === newJob.id);
                    if (existingJob && existingJob.status !== newJob.status) {
                        console.log('[REALTIME-DIAGNOSTIC] Job status changed:', {
                            timestamp,
                            userId,
                            jobId: newJob.id,
                            oldStatus: existingJob.status,
                            newStatus: newJob.status,
                        });

                        if (newJob.status === 'completed') {
                            // ✅ Sucesso - NÃO mostrar toast aqui
                            // O componente já mostra toast quando a imagem carrega
                            console.log('✅ Job completed:', {
                                jobId: newJob.id,
                                requestId: newJob.requestId,
                                type: newJob.type,
                                modelId: newJob.modelId
                            });
                        } else if (newJob.status === 'failed') {
                            // 🔧 FILTRO MELHORADO: Não mostrar erros relacionados a nós removidos
                            const errorMessage = newJob.error || '';

                            // Lista de padrões que indicam falsos positivos (nó foi removido)
                            const falsePositivePatterns = [
                                'Node not found',
                                'Target node',
                                'not found in project',
                                'Invalid project content structure',
                                'Project not found',
                                'may have been deleted'
                            ];

                            const isFalsePositive = falsePositivePatterns.some(pattern =>
                                errorMessage.includes(pattern)
                            );

                            if (isFalsePositive) {
                                console.warn('⚠️ Suprimindo toast de erro (falso positivo):', {
                                    jobId: newJob.id,
                                    requestId: newJob.requestId,
                                    error: errorMessage,
                                    reason: 'Nó foi removido após job criado'
                                });
                                // Não exibir toast, apenas logar
                                wasUpdated = true;
                                updatedJobs = prevJobs.map(job =>
                                    job.id === newJob.id ? newJob : job
                                );

                                // [DIAGNOSTIC] Log updated jobs state after update
                                console.log('[REALTIME-DIAGNOSTIC] Jobs state AFTER update (false positive):', {
                                    timestamp,
                                    userId,
                                    jobId,
                                    type,
                                    count: updatedJobs.length,
                                    jobIds: updatedJobs.map(j => j.id),
                                    wasAdded,
                                    wasRemoved,
                                    wasUpdated,
                                    isDuplicate,
                                });

                                return updatedJobs;
                            }

                            // ❌ Erro real - mostrar ao usuário
                            toast.error('Erro na geração', {
                                description: errorMessage || 'Falha ao processar requisição'
                            });
                        }
                    }

                    // Update job in list
                    wasUpdated = true;
                    updatedJobs = prevJobs.map(job =>
                        job.id === newJob.id ? newJob : job
                    );
                    break;

                case 'DELETE':
                    if (!oldJob) {
                        console.warn('[REALTIME-DIAGNOSTIC] DELETE event without oldJob', { timestamp, userId });
                        return prevJobs;
                    }

                    wasRemoved = true;
                    updatedJobs = prevJobs.filter(job => job.id !== oldJob.id);
                    break;

                default:
                    console.warn('[REALTIME-DIAGNOSTIC] Unknown event type:', { timestamp, userId, type });
                    return prevJobs;
            }

            // [DIAGNOSTIC] Log updated jobs state after update
            console.log('[REALTIME-DIAGNOSTIC] Jobs state AFTER update:', {
                timestamp,
                userId,
                jobId,
                type,
                count: updatedJobs.length,
                jobIds: updatedJobs.map(j => j.id),
                wasAdded,
                wasRemoved,
                wasUpdated,
                isDuplicate,
                countChange: updatedJobs.length - prevJobs.length,
            });

            return updatedJobs;
        });
    }, [userId]);

    // Add job optimistically (before Realtime update)
    const addJobOptimistically = useCallback((job: FalJob) => {
        const timestamp = new Date().toISOString();
        console.log('➕➕➕ [QueueMonitor] addJobOptimistically CALLED:', {
            jobId: job.id,
            requestId: job.requestId,
            status: job.status,
            type: job.type,
            userId: job.userId,
            currentJobCount: jobs.length,
            timestamp,
        });

        console.trace('➕ [QueueMonitor] Call stack for addJobOptimistically');

        console.log('➕ [QueueMonitor] About to call setJobs with job:', {
            jobId: job.id,
            timestamp,
        });

        setJobs(prevJobs => {
            console.log('➕ [QueueMonitor] Inside setJobs callback:', {
                timestamp,
                prevJobsCount: prevJobs.length,
                prevJobIds: prevJobs.map(j => j.id),
                newJobId: job.id,
                newJobRequestId: job.requestId,
            });

            // [DEDUPLICATION] Check if job already exists by jobId
            const existingJob = prevJobs.find(j => j.id === job.id);
            if (existingJob) {
                console.log('[DEDUPLICATION] Job already exists (optimistic or broadcast), skipping:', {
                    jobId: job.id,
                    existingStatus: existingJob.status,
                    newStatus: job.status,
                    source: 'optimistic_add',
                });
                return prevJobs;
            }

            // [DEDUPLICATION] Also check by requestId as fallback
            // This handles edge case where jobId might differ but requestId is same
            const existingByRequestId = prevJobs.find(j => j.requestId === job.requestId);
            if (existingByRequestId) {
                console.log('[DEDUPLICATION] Job with same requestId exists, skipping:', {
                    jobId: job.id,
                    existingJobId: existingByRequestId.id,
                    requestId: job.requestId,
                    source: 'optimistic_add',
                });
                return prevJobs;
            }

            console.log('✅ [QueueMonitor] Adding new job optimistically:', {
                jobId: job.id,
                requestId: job.requestId,
                previousCount: prevJobs.length,
                newCount: prevJobs.length + 1,
            });

            // Add new job at the beginning
            const newJobs = [job, ...prevJobs];

            console.log('✅ [QueueMonitor] Job added to state:', {
                jobId: job.id,
                totalJobs: newJobs.length,
                jobIds: newJobs.map(j => j.id),
            });

            return newJobs;
        });
    }, []);

    // Remove job from local state (UI only)
    const removeJob = useCallback((jobId: string) => {
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
        realtimeLogger.info('Job removed from view', {
            userId,
            jobId
        });
    }, [userId]);

    // Clear all completed jobs from local state
    const clearCompleted = useCallback(() => {
        setJobs(prevJobs => prevJobs.filter(job => job.status !== 'completed'));
        realtimeLogger.info('Completed jobs cleared', { userId });
    }, [userId]);

    // Clear all failed jobs from local state
    const clearFailed = useCallback(() => {
        setJobs(prevJobs => prevJobs.filter(job => job.status !== 'failed'));
        realtimeLogger.info('Failed jobs cleared', { userId });
    }, [userId]);

    // Fetch jobs on mount and when dependencies change
    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    // Subscribe to ALL events (INSERT, UPDATE, DELETE) using a single subscription
    // The database trigger sends INSERT, UPDATE, DELETE as separate events
    // RealtimeConnectionManager reuses the same channel for all subscriptions to the same topic
    // Following Supabase best practices: private channels for database triggers, no self-broadcast
    console.log('🔌 [QueueMonitor] Setting up subscription:', {
        topic: `fal_jobs:${userId}`,
        enabled: enabled && !!userId,
        userId,
    });

    const subscription = useRealtimeSubscription<any>({
        topic: `fal_jobs:${userId}`,
        event: '*',  // Listen to all events (INSERT, UPDATE, DELETE)
        onMessage: handleJobUpdate,
        enabled: enabled && !!userId,
        private: true,  // Required for RLS authorization
        self: false,    // Don't receive own broadcasts
        ack: true       // Request acknowledgment
    });

    // Use connection state from single subscription
    const isConnected = subscription.isConnected;

    // [DIAGNOSTIC] Log connection state changes
    useEffect(() => {
        console.log('📊 [QueueMonitor] Connection state:', {
            isConnected,
            connectionState: subscription.connectionState,
            userId,
        });
    }, [isConnected, subscription.connectionState, userId]);

    // Update error state if realtime error occurs
    useEffect(() => {
        if (subscription.error) {
            setError(new Error(subscription.error.message));
            realtimeLogger.error('Realtime subscription error', {
                userId,
                error: subscription.error.message,
                type: subscription.error.type
            });
        }
    }, [subscription.error, userId]);

    // [DEBUG] Log return values
    console.log('🔄 [useQueueMonitor] Returning values:', {
        jobCount: jobs.length,
        activeCount,
        isLoading,
        isConnected,
        hasError: !!error,
        timestamp: new Date().toISOString(),
    });

    return {
        jobs,
        activeCount,
        isLoading,
        error,
        isConnected,
        refresh: fetchJobs,
        addJobOptimistically,
        removeJob,
        clearCompleted,
        clearFailed
    };
}
