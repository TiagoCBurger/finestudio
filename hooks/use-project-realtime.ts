'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    REALTIME_SUBSCRIBE_STATES,
    REALTIME_CHANNEL_STATES,
    type RealtimeChannel,
    type SupabaseClient
} from '@supabase/supabase-js';
import { mutate } from 'swr';
import { realtimeLogger } from '@/lib/realtime-logger';

/**
 * Configuration constants for subscription management
 */
const DEBOUNCE_DELAY = 500; // ms - Delay before attempting subscription
const MAX_RETRIES = 3; // Maximum number of retry attempts
const RETRY_DELAYS = [1000, 2000, 4000]; // ms - Exponential backoff delays

/**
 * Payload structure for project_updated broadcast events
 */
interface ProjectUpdatePayload {
    type: 'UPDATE' | 'INSERT' | 'DELETE';
    table: string;
    schema: string;
    new?: Record<string, unknown>;
    old?: Record<string, unknown>;
}

/**
 * Subscription state tracking
 */
interface SubscriptionState {
    isSubscribing: boolean;
    isSubscribed: boolean;
    retryCount: number;
    lastAttemptTimestamp: number | null;
    lastError?: {
        message: string;
        timestamp: number;
        status?: string;
        hint?: string;
    };
}

/**
 * Return type for useProjectRealtime hook
 */
interface UseProjectRealtimeReturn {
    subscriptionState: SubscriptionState;
    retrySubscription: () => void;
}

/**
 * Hook to subscribe to project changes via Supabase Realtime
 * Automatically updates when fal.ai webhook modifies the project
 * 
 * Uses broadcast for better scalability (recommended over postgres_changes)
 * Follows Supabase Realtime best practices with proper error handling and cleanup
 * 
 * @param projectId - The ID of the project to subscribe to
 * @returns Object containing subscription state and retry method
 */
export function useProjectRealtime(projectId: string | undefined): UseProjectRealtimeReturn {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const supabaseRef = useRef<SupabaseClient | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const subscriptionStateRef = useRef<SubscriptionState>({
        isSubscribing: false,
        isSubscribed: false,
        retryCount: 0,
        lastAttemptTimestamp: null
    });

    // State to trigger re-renders when subscription state changes
    const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
        isSubscribing: false,
        isSubscribed: false,
        retryCount: 0,
        lastAttemptTimestamp: null
    });

    // Helper to update both ref and state
    const updateSubscriptionState = useCallback((newState: Partial<SubscriptionState>) => {
        subscriptionStateRef.current = {
            ...subscriptionStateRef.current,
            ...newState
        };
        setSubscriptionState(subscriptionStateRef.current);

        realtimeLogger.info('📊 Subscription state updated', realtimeLogger.createContext({
            projectId,
            ...subscriptionStateRef.current
        }));
    }, [projectId]);

    // Manual retry method for debugging
    const retrySubscription = useCallback(() => {
        realtimeLogger.info('🔄 Manual retry requested', realtimeLogger.createContext({
            projectId,
            currentState: subscriptionStateRef.current
        }));

        // Clean up existing channel
        if (channelRef.current && supabaseRef.current) {
            supabaseRef.current.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        // Reset state to allow retry
        updateSubscriptionState({
            isSubscribing: false,
            isSubscribed: false,
            retryCount: 0,
            lastAttemptTimestamp: null,
            lastError: undefined
        });

        realtimeLogger.success('✅ Subscription reset, will retry automatically', { projectId });
    }, [projectId, updateSubscriptionState]);

    // Memoized handler for project updates
    const handleProjectUpdate = useCallback((payload: ProjectUpdatePayload) => {
        // Enhanced broadcast receive logging (sanitized for security)
        realtimeLogger.info('📨 Broadcast received', realtimeLogger.createContext({
            projectId,
            payloadType: typeof payload,
            hasPayload: !!payload,
            payloadKeys: payload ? Object.keys(payload).filter(k => !['new', 'old'].includes(k)) : []
        }));

        // Filter out unexpected payload structures to prevent raw data display
        if (!payload || typeof payload !== 'object') {
            realtimeLogger.warn('Invalid payload received, ignoring', {
                projectId,
                payloadType: typeof payload,
                hint: 'Check database trigger function is sending correct payload structure'
            });
            return;
        }

        // If payload contains raw project data (nodes array), extract only what we need
        const cleanPayload = {
            type: payload.type || 'UPDATE',
            table: payload.table || 'project',
            schema: payload.schema || 'public'
        };

        // Only log in development to reduce production noise
        if (process.env.NODE_ENV === 'development') {
            realtimeLogger.info('Project updated via broadcast', realtimeLogger.createContext({
                projectId,
                type: cleanPayload.type,
                table: cleanPayload.table,
                hasNewData: !!payload.new,
                hasOldData: !!payload.old
            }));
        }

        // Revalidate SWR cache to update UI
        try {
            const timestamp = new Date().toISOString();
            realtimeLogger.info('🔄 Calling mutate() to revalidate project cache', {
                projectId,
                cacheKey: `/api/projects/${projectId}`,
                timestamp
            });

            // Force revalidation with revalidate: true
            mutate(`/api/projects/${projectId}`, undefined, { revalidate: true });

            realtimeLogger.success('✅ mutate() called successfully', {
                projectId,
                timestamp
            });
        } catch (error) {
            realtimeLogger.error('❌ Error calling mutate()', realtimeLogger.createContext({
                projectId,
                error: error instanceof Error ? error.message : error,
                hint: 'Check SWR configuration and API endpoint availability'
            }));
        }
    }, [projectId]);

    useEffect(() => {
        // Clear any pending debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        if (!projectId) {
            // Clean up if projectId becomes undefined
            realtimeLogger.info('No projectId provided', {
                action: 'cleanup'
            });

            if (channelRef.current) {
                supabaseRef.current?.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            updateSubscriptionState({
                isSubscribing: false,
                isSubscribed: false,
                retryCount: 0,
                lastAttemptTimestamp: null,
                lastError: undefined
            });
            return;
        }

        // If channel exists but is not joined, remove it first to prevent duplicate subscription errors
        if (channelRef.current && channelRef.current.state !== REALTIME_CHANNEL_STATES.joined) {
            const currentState = channelRef.current.state;
            realtimeLogger.info('Removing existing channel before creating new one', {
                projectId,
                currentChannelState: currentState
            });
            supabaseRef.current?.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        // Debounce subscription attempts to prevent rapid re-subscriptions
        realtimeLogger.info('Scheduling subscription attempt with debounce', {
            projectId,
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
                    projectId,
                    channelState,
                    subscriptionState: state
                });
                return;
            }

            // Check if already subscribed
            if (isAlreadySubscribed) {
                realtimeLogger.info('Already subscribed to project, skipping', {
                    projectId,
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
                        projectId,
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
                    projectId,
                    retryCount: state.retryCount,
                    maxRetries: MAX_RETRIES
                });
                return;
            }

            // Update subscription state
            updateSubscriptionState({
                isSubscribing: true,
                lastAttemptTimestamp: now
            });

            realtimeLogger.info('Starting subscription attempt', {
                projectId,
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
                .channel(`project:${projectId}`, {
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
                    { event: 'UPDATE' }, // Listen for UPDATE events from trigger
                    handleProjectUpdate
                )
                .on(
                    'broadcast' as any,
                    { event: 'INSERT' }, // Listen for INSERT events from trigger
                    handleProjectUpdate
                );

            channelRef.current = channel;

            realtimeLogger.info('Channel created, getting session', {
                projectId,
                channelTopic: `project:${projectId}`
            });

            // Get the current session and set auth before subscribing (required for private channels)
            supabase.auth.getSession()
                .then(({ data: { session }, error: sessionError }) => {
                    if (sessionError) {
                        const errorInfo = {
                            message: sessionError.message,
                            timestamp: Date.now(),
                            status: 'SESSION_ERROR',
                            hint: 'Check authentication configuration and ensure user is logged in'
                        };

                        realtimeLogger.error('❌ Error getting session', realtimeLogger.createContext({
                            projectId,
                            error: sessionError.message,
                            errorCode: sessionError.code,
                            retryCount: state.retryCount,
                            hint: errorInfo.hint
                        }));

                        updateSubscriptionState({
                            isSubscribing: false,
                            lastError: errorInfo
                        });
                        return;
                    }

                    if (!session) {
                        const errorInfo = {
                            message: 'No active session found',
                            timestamp: Date.now(),
                            status: 'NO_SESSION',
                            hint: 'User must be logged in to use private channels. Redirect to login page or refresh the session.'
                        };

                        realtimeLogger.error('❌ No active session found', realtimeLogger.createContext({
                            projectId,
                            retryCount: state.retryCount,
                            hint: errorInfo.hint
                        }));

                        updateSubscriptionState({
                            isSubscribing: false,
                            lastError: errorInfo
                        });
                        return;
                    }

                    // Debug: Log session details
                    realtimeLogger.debugConnectionState(`project:${projectId}`, {
                        hasSession: true,
                        sessionExpiry: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown',
                        retryCount: state.retryCount
                    });

                    realtimeLogger.info('✅ Session found, setting auth for realtime', realtimeLogger.createContext({
                        projectId,
                        sessionUserId: session.user.id,
                        sessionExpiresAt: session.expires_at,
                        sessionExpiresIn: session.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) + 's' : 'unknown',
                        retryCount: state.retryCount
                    }));

                    // Set auth with the current session token
                    supabase.realtime.setAuth(session.access_token);

                    realtimeLogger.info('🔐 Auth set for realtime, waiting 2s before subscribing', realtimeLogger.createContext({
                        projectId,
                        channelTopic: `project:${projectId}`,
                        retryCount: state.retryCount
                    }));

                    // Wait 2 seconds for auth to propagate to Realtime server (increased from 1s)
                    return new Promise(resolve => setTimeout(resolve, 2000));
                })
                .then(() => {
                    realtimeLogger.info('⏰ Delay complete, subscribing to channel now', {
                        projectId,
                        channelTopic: `project:${projectId}`
                    });

                    // Subscribe after auth is set and delay
                    return channel.subscribe((status, err) => {
                        const logContext = realtimeLogger.createContext({
                            projectId,
                            channelTopic: `project:${projectId}`,
                            retryCount: subscriptionStateRef.current.retryCount,
                            channelState: channel.state,
                            status
                        });

                        realtimeLogger.info(`📡 Subscription status: ${status}`, logContext);

                        switch (status) {
                            case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
                                realtimeLogger.success('✅ SUBSCRIBED - Successfully connected to project channel', {
                                    ...logContext,
                                    hint: 'Channel is now active and will receive broadcasts'
                                });
                                updateSubscriptionState({
                                    isSubscribing: false,
                                    isSubscribed: true,
                                    retryCount: 0, // Reset retry count on success
                                    lastAttemptTimestamp: Date.now(),
                                    lastError: undefined // Clear any previous errors
                                });
                                break;

                            case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
                                let channelErrorHint = 'Will retry with exponential backoff. Check browser console for more details.';

                                // Provide actionable hints based on error type
                                if (err?.message?.includes('403') || err?.message?.includes('Forbidden')) {
                                    channelErrorHint = 'Authorization failed. Check RLS policies on realtime.messages table and ensure user has access to this project.';
                                } else if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
                                    channelErrorHint = 'Authentication failed. Session may have expired. Try refreshing the page or logging in again.';
                                } else if (err?.message?.includes('timeout')) {
                                    channelErrorHint = 'Connection timeout. Check network connectivity and Supabase service status.';
                                }

                                const errorDetails = {
                                    ...logContext,
                                    error: err,
                                    errorMessage: err?.message || 'Unknown error',
                                    errorType: (err as any)?.type || 'unknown',
                                    nextRetryIn: RETRY_DELAYS[Math.min(subscriptionStateRef.current.retryCount, RETRY_DELAYS.length - 1)],
                                    retriesRemaining: MAX_RETRIES - subscriptionStateRef.current.retryCount - 1,
                                    hint: channelErrorHint
                                };

                                realtimeLogger.error('❌ CHANNEL_ERROR - Subscription failed', errorDetails);

                                updateSubscriptionState({
                                    isSubscribing: false,
                                    isSubscribed: false,
                                    retryCount: subscriptionStateRef.current.retryCount + 1,
                                    lastAttemptTimestamp: Date.now(),
                                    lastError: {
                                        message: err?.message || 'Unknown error',
                                        timestamp: Date.now(),
                                        status: 'CHANNEL_ERROR',
                                        hint: channelErrorHint
                                    }
                                });
                                break;

                            case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
                                const nextRetryDelay = RETRY_DELAYS[Math.min(subscriptionStateRef.current.retryCount, RETRY_DELAYS.length - 1)];
                                const timeoutHint = `Connection timed out. Will retry in ${nextRetryDelay}ms. Check network connectivity and firewall settings.`;

                                realtimeLogger.error('⏱️ TIMED_OUT - Subscription attempt timed out', {
                                    ...logContext,
                                    nextRetryDelay,
                                    retriesRemaining: MAX_RETRIES - subscriptionStateRef.current.retryCount - 1,
                                    hint: timeoutHint
                                });

                                updateSubscriptionState({
                                    isSubscribing: false,
                                    isSubscribed: false,
                                    retryCount: subscriptionStateRef.current.retryCount + 1,
                                    lastAttemptTimestamp: Date.now(),
                                    lastError: {
                                        message: 'Subscription timed out',
                                        timestamp: Date.now(),
                                        status: 'TIMED_OUT',
                                        hint: timeoutHint
                                    }
                                });
                                break;

                            case REALTIME_SUBSCRIBE_STATES.CLOSED:
                                const closedHint = 'Channel was closed. This may be intentional or due to network issues.';

                                realtimeLogger.info('🔌 CLOSED - Channel connection closed', {
                                    ...logContext,
                                    hint: closedHint
                                });

                                updateSubscriptionState({
                                    isSubscribing: false,
                                    isSubscribed: false,
                                    retryCount: subscriptionStateRef.current.retryCount,
                                    lastAttemptTimestamp: Date.now(),
                                    lastError: {
                                        message: 'Channel closed',
                                        timestamp: Date.now(),
                                        status: 'CLOSED',
                                        hint: closedHint
                                    }
                                });
                                break;

                            default:
                                realtimeLogger.info(`📊 Status update: ${status}`, {
                                    ...logContext,
                                    error: err,
                                    hint: 'Intermediate subscription state'
                                });
                        }
                    });
                })
                .catch((error) => {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorStack = error instanceof Error ? error.stack : undefined;
                    const catchHint = 'Unexpected error during subscription. Check browser console for stack trace and verify Supabase configuration.';

                    realtimeLogger.error('❌ Error during subscription process', realtimeLogger.createContext({
                        projectId,
                        error: errorMessage,
                        errorStack,
                        retryCount: state.retryCount,
                        retriesRemaining: MAX_RETRIES - state.retryCount - 1,
                        hint: catchHint
                    }));

                    updateSubscriptionState({
                        isSubscribing: false,
                        isSubscribed: false,
                        retryCount: subscriptionStateRef.current.retryCount + 1,
                        lastAttemptTimestamp: Date.now(),
                        lastError: {
                            message: errorMessage,
                            timestamp: Date.now(),
                            status: 'SUBSCRIPTION_ERROR',
                            hint: catchHint
                        }
                    });
                });
        }, DEBOUNCE_DELAY);

        // Cleanup on unmount or projectId change
        return () => {
            realtimeLogger.info('Cleaning up subscription for project', {
                projectId,
                channelState: channelRef.current?.state,
                subscriptionState: subscriptionStateRef.current
            });

            // Clear debounce timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }

            // Reset subscription state
            updateSubscriptionState({
                isSubscribing: false,
                isSubscribed: false,
                retryCount: 0,
                lastAttemptTimestamp: null,
                lastError: undefined
            });

            // Remove channel
            if (channelRef.current && supabaseRef.current) {
                supabaseRef.current.removeChannel(channelRef.current);
                channelRef.current = null;
                realtimeLogger.success('Channel removed successfully', { projectId });
            }
        };
    }, [projectId, handleProjectUpdate, updateSubscriptionState]);

    // Return subscription state and retry method for debugging
    return {
        subscriptionState,
        retrySubscription
    };
}