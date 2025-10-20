'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    REALTIME_SUBSCRIBE_STATES,
    REALTIME_CHANNEL_STATES,
    type RealtimeChannel,
    type SupabaseClient
} from '@supabase/supabase-js';
import { realtimeLogger } from '@/lib/realtime-logger';
import { toast } from 'sonner';

/**
 * Configuration constants for subscription management
 */
const DEBOUNCE_DELAY = 500; // ms - Delay before attempting subscription
const MAX_RETRIES = 3; // Maximum number of retry attempts
const RETRY_DELAYS = [1000, 2000, 4000]; // ms - Exponential backoff delays

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
 */
interface JobUpdatePayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    schema: string;
    new?: FalJob;
    old?: FalJob;
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
    refresh: () => Promise<void>;
    removeJob: (jobId: string) => void;
    clearCompleted: () => void;
    clearFailed: () => void;
}

/**
 * Subscription state tracking
 */
interface SubscriptionState {
    isSubscribing: boolean;
    isSubscribed: boolean;
    retryCount: number;
    lastAttemptTimestamp: number | null;
}

/**
 * Hook to monitor fal.ai job queue with real-time updates
 * 
 * Features:
 * - Fetches jobs from API on mount
 * - Subscribes to Supabase Realtime for live updates
 * - Calculates active job count (pending jobs)
 * - Provides functions to manage job list
 * - Shows toast notifications on job completion/failure
 * 
 * Uses broadcast for better scalability (recommended over postgres_changes)
 * Follows Supabase Realtime best practices with proper error handling and cleanup
 */
export function useQueueMonitor({
    userId,
    projectId,
    enabled = true
}: UseQueueMonitorOptions): UseQueueMonitorReturn {
    const [jobs, setJobs] = useState<FalJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const channelRef = useRef<RealtimeChannel | null>(null);
    const supabaseRef = useRef<SupabaseClient | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const subscriptionStateRef = useRef<SubscriptionState>({
        isSubscribing: false,
        isSubscribed: false,
        retryCount: 0,
        lastAttemptTimestamp: null
    });

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

    // Handle job updates from realtime
    const handleJobUpdate = useCallback((payload: JobUpdatePayload) => {
        if (!payload || typeof payload !== 'object') {
            realtimeLogger.warn('Invalid payload received, ignoring', { userId, payload: typeof payload });
            return;
        }

        const { type, new: newJob, old: oldJob } = payload;

        realtimeLogger.info('Job update received', {
            userId,
            type,
            jobId: newJob?.id || oldJob?.id
        });

        setJobs(prevJobs => {
            switch (type) {
                case 'INSERT':
                    if (!newJob) return prevJobs;
                    // Add new job if not already in list
                    if (prevJobs.some(j => j.id === newJob.id)) {
                        return prevJobs;
                    }
                    return [newJob, ...prevJobs];

                case 'UPDATE':
                    if (!newJob) return prevJobs;

                    // Show toast notification on status change
                    const existingJob = prevJobs.find(j => j.id === newJob.id);
                    if (existingJob && existingJob.status !== newJob.status) {
                        if (newJob.status === 'completed') {
                            toast.success('Geração completada com sucesso!', {
                                description: `${newJob.type === 'image' ? 'Imagem' : 'Vídeo'} - ${newJob.modelId}`
                            });
                        } else if (newJob.status === 'failed') {
                            // 🔧 MELHORIA: Filtrar erros que são falsos positivos
                            const errorMessage = newJob.error || '';
                            const isNodeNotFoundError = errorMessage.includes('Node not found') ||
                                errorMessage.includes('Target node') ||
                                errorMessage.includes('not found in project');

                            // Se for erro relacionado a nó não encontrado, pode ser falso positivo
                            // Isso acontece quando o webhook tenta atualizar um nó que foi removido
                            if (isNodeNotFoundError) {
                                console.warn('⚠️ Suprimindo toast de erro para job failed com "node not found":', {
                                    jobId: newJob.id,
                                    requestId: newJob.requestId,
                                    error: errorMessage,
                                    reason: 'Possível falso positivo - nó pode ter sido removido após job criado'
                                });

                                // Não exibir toast de erro para estes casos
                                return;
                            }

                            // Para outros erros reais, exibir normalmente
                            toast.error('Erro na geração', {
                                description: errorMessage || 'Falha ao processar requisição'
                            });
                        }
                    }

                    // Update job in list
                    return prevJobs.map(job =>
                        job.id === newJob.id ? newJob : job
                    );

                case 'DELETE':
                    if (!oldJob) return prevJobs;
                    // Remove job from list
                    return prevJobs.filter(job => job.id !== oldJob.id);

                default:
                    return prevJobs;
            }
        });
    }, [userId]);

    // Remove job from local state (UI only)
    const removeJob = useCallback((jobId: string) => {
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
        realtimeLogger.info('Job removed from view', { userId, jobId });
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

    // Subscribe to realtime updates with debouncing and retry logic
    useEffect(() => {
        // Clear any pending debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        if (!userId || !enabled) {
            // Clean up if userId becomes undefined or disabled
            realtimeLogger.info('Subscription disabled or no userId', {
                userId,
                enabled,
                action: 'cleanup'
            });

            if (channelRef.current) {
                supabaseRef.current?.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            subscriptionStateRef.current = {
                isSubscribing: false,
                isSubscribed: false,
                retryCount: 0,
                lastAttemptTimestamp: null
            };
            return;
        }

        // Debounce subscription attempts to prevent rapid re-subscriptions
        realtimeLogger.info('Scheduling subscription attempt with debounce', {
            userId,
            debounceDelay: DEBOUNCE_DELAY,
            currentState: subscriptionStateRef.current
        });

        debounceTimerRef.current = setTimeout(() => {
            const state = subscriptionStateRef.current;
            const now = Date.now();

            // Enhanced state checking - verify multiple conditions before subscribing
            const channelState = channelRef.current?.state;
            const isChannelJoined = channelState === REALTIME_CHANNEL_STATES.joined;
            const isAlreadySubscribed = isChannelJoined || state.isSubscribed;

            // Check if we're already in the process of subscribing
            if (state.isSubscribing) {
                realtimeLogger.info('Subscription already in progress, skipping', {
                    userId,
                    channelState,
                    subscriptionState: state
                });
                return;
            }

            // Check if already subscribed
            if (isAlreadySubscribed) {
                realtimeLogger.info('Already subscribed to fal_jobs, skipping', {
                    userId,
                    channelState,
                    isChannelJoined,
                    subscriptionState: state
                });
                return;
            }

            // Check if we should wait before retrying (timestamp verification)
            if (state.lastAttemptTimestamp) {
                const timeSinceLastAttempt = now - state.lastAttemptTimestamp;
                const minRetryDelay = state.retryCount > 0 ? RETRY_DELAYS[Math.min(state.retryCount - 1, RETRY_DELAYS.length - 1)] : 0;

                if (timeSinceLastAttempt < minRetryDelay) {
                    realtimeLogger.info('Too soon to retry, waiting', {
                        userId,
                        timeSinceLastAttempt,
                        minRetryDelay,
                        retryCount: state.retryCount
                    });
                    return;
                }
            }

            // Check if we've exceeded max retries
            if (state.retryCount >= MAX_RETRIES) {
                realtimeLogger.error('Max retries exceeded, giving up', {
                    userId,
                    retryCount: state.retryCount,
                    maxRetries: MAX_RETRIES
                });
                return;
            }

            // Update subscription state
            subscriptionStateRef.current = {
                ...state,
                isSubscribing: true,
                lastAttemptTimestamp: now
            };

            realtimeLogger.info('Starting subscription attempt', {
                userId,
                attemptNumber: state.retryCount + 1,
                maxRetries: MAX_RETRIES,
                channelState,
                timestamp: now
            });

            // Create and cache Supabase client
            if (!supabaseRef.current) {
                supabaseRef.current = createClient();
            }
            const supabase = supabaseRef.current;

            // Use broadcast with recommended settings
            // Following naming convention: scope:entity:id
            const channel = supabase
                .channel(`fal_jobs:${userId}`, {
                    config: {
                        broadcast: {
                            self: false, // Don't receive our own broadcasts
                            ack: true    // Enable ack for better reliability
                        },
                        private: true, // Use private channel for better security
                    },
                })
                .on(
                    'broadcast' as any,
                    { event: 'INSERT' },
                    handleJobUpdate
                )
                .on(
                    'broadcast' as any,
                    { event: 'UPDATE' },
                    handleJobUpdate
                )
                .on(
                    'broadcast' as any,
                    { event: 'DELETE' },
                    handleJobUpdate
                );

            channelRef.current = channel;

            realtimeLogger.info('Channel created, getting session', {
                userId,
                channelTopic: `fal_jobs:${userId}`
            });

            // Get the current session and set auth before subscribing (required for private channels)
            supabase.auth.getSession()
                .then(({ data: { session }, error: sessionError }) => {
                    if (sessionError) {
                        realtimeLogger.error('Error getting session', {
                            userId,
                            error: sessionError.message,
                            retryCount: state.retryCount
                        });
                        subscriptionStateRef.current.isSubscribing = false;
                        return;
                    }

                    if (!session) {
                        realtimeLogger.error('No active session found', {
                            userId,
                            note: 'User must be logged in to use private channels',
                            retryCount: state.retryCount
                        });
                        subscriptionStateRef.current.isSubscribing = false;
                        return;
                    }

                    realtimeLogger.info('Session found, setting auth for realtime', {
                        userId,
                        sessionUserId: session.user.id,
                        retryCount: state.retryCount
                    });

                    // Set auth with the current session token
                    return supabase.realtime.setAuth(session.access_token);
                })
                .then(() => {
                    realtimeLogger.info('Auth set for realtime, subscribing to channel', {
                        userId,
                        retryCount: state.retryCount
                    });

                    // Subscribe after auth is set
                    return channel.subscribe((status, err) => {
                        const logContext = {
                            userId,
                            channelTopic: `fal_jobs:${userId}`,
                            retryCount: subscriptionStateRef.current.retryCount,
                            channelState: channel.state
                        };

                        realtimeLogger.info('Subscription status update', {
                            ...logContext,
                            status,
                            error: err
                        });

                        switch (status) {
                            case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
                                realtimeLogger.success('SUBSCRIBED - Successfully connected to fal_jobs channel', logContext);
                                subscriptionStateRef.current = {
                                    isSubscribing: false,
                                    isSubscribed: true,
                                    retryCount: 0, // Reset retry count on success
                                    lastAttemptTimestamp: Date.now()
                                };
                                break;

                            case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
                                realtimeLogger.error('CHANNEL_ERROR - Subscription failed', {
                                    ...logContext,
                                    error: err,
                                    errorMessage: err?.message || 'Unknown error',
                                    note: 'Will retry with exponential backoff'
                                });
                                subscriptionStateRef.current = {
                                    isSubscribing: false,
                                    isSubscribed: false,
                                    retryCount: subscriptionStateRef.current.retryCount + 1,
                                    lastAttemptTimestamp: Date.now()
                                };
                                break;

                            case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
                                realtimeLogger.error('TIMED_OUT - Subscription attempt timed out', {
                                    ...logContext,
                                    note: 'Will retry with exponential backoff',
                                    nextRetryDelay: RETRY_DELAYS[Math.min(subscriptionStateRef.current.retryCount, RETRY_DELAYS.length - 1)]
                                });
                                subscriptionStateRef.current = {
                                    isSubscribing: false,
                                    isSubscribed: false,
                                    retryCount: subscriptionStateRef.current.retryCount + 1,
                                    lastAttemptTimestamp: Date.now()
                                };
                                break;

                            case REALTIME_SUBSCRIBE_STATES.CLOSED:
                                realtimeLogger.info('CLOSED - Channel connection closed', logContext);
                                subscriptionStateRef.current = {
                                    isSubscribing: false,
                                    isSubscribed: false,
                                    retryCount: subscriptionStateRef.current.retryCount,
                                    lastAttemptTimestamp: Date.now()
                                };
                                break;

                            default:
                                realtimeLogger.info('Status update', {
                                    ...logContext,
                                    status,
                                    error: err
                                });
                        }
                    });
                })
                .catch((error) => {
                    realtimeLogger.error('Error during subscription process', {
                        userId,
                        error: error instanceof Error ? error.message : error,
                        retryCount: state.retryCount
                    });
                    subscriptionStateRef.current = {
                        isSubscribing: false,
                        isSubscribed: false,
                        retryCount: subscriptionStateRef.current.retryCount + 1,
                        lastAttemptTimestamp: Date.now()
                    };
                });
        }, DEBOUNCE_DELAY);

        // Cleanup on unmount or userId change
        return () => {
            realtimeLogger.info('Cleaning up subscription for fal_jobs', {
                userId,
                channelState: channelRef.current?.state,
                subscriptionState: subscriptionStateRef.current
            });

            // Clear debounce timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }

            // Reset subscription state
            subscriptionStateRef.current = {
                isSubscribing: false,
                isSubscribed: false,
                retryCount: 0,
                lastAttemptTimestamp: null
            };

            // Remove channel
            if (channelRef.current && supabaseRef.current) {
                supabaseRef.current.removeChannel(channelRef.current);
                channelRef.current = null;
                realtimeLogger.success('Channel removed successfully', { userId });
            }
        };
    }, [userId, enabled, handleJobUpdate]);

    return {
        jobs,
        activeCount,
        isLoading,
        error,
        refresh: fetchJobs,
        removeJob,
        clearCompleted,
        clearFailed
    };
}
