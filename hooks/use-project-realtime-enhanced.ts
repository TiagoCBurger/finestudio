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
 * Connection state for the realtime subscription
 */
interface RealtimeConnectionState {
    isConnected: boolean;
    isConnecting: boolean;
    error: Error | null;
    lastConnectedAt: Date | null;
    reconnectAttempts: number;
}

/**
 * Enhanced hook to subscribe to project changes via Supabase Realtime
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection state tracking
 * - Proper error handling and cleanup
 * - TypeScript type safety
 * - Follows Supabase Realtime best practices
 * 
 * @param projectId - The project ID to subscribe to
 * @param options - Configuration options
 * @returns Connection state and control functions
 */
export function useProjectRealtimeEnhanced(
    projectId: string | undefined,
    options: {
        /** Enable debug logging */
        debug?: boolean;
        /** Custom SWR key for cache invalidation */
        swrKey?: string;
        /** Callback when project is updated */
        onProjectUpdate?: (payload: ProjectUpdatePayload) => void;
        /** Maximum reconnection attempts */
        maxReconnectAttempts?: number;
    } = {}
) {
    const {
        debug = false,
        swrKey,
        onProjectUpdate,
        maxReconnectAttempts = 5
    } = options;

    // Refs for stable references
    const channelRef = useRef<RealtimeChannel | null>(null);
    const supabaseRef = useRef<SupabaseClient | null>(null);
    const isSubscribingRef = useRef(false);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Connection state
    const [connectionState, setConnectionState] = useState<RealtimeConnectionState>({
        isConnected: false,
        isConnecting: false,
        error: null,
        lastConnectedAt: null,
        reconnectAttempts: 0
    });

    // Logging helper
    const log = useCallback((...args: unknown[]) => {
        if (debug) {
            console.log('🔴 [ProjectRealtime]', ...args);
        }
    }, [debug]);

    // Memoized handler for project updates
    const handleProjectUpdate = useCallback((payload: ProjectUpdatePayload) => {
        // Filter out unexpected payload structures to prevent raw data display
        if (!payload || typeof payload !== 'object') {
            log('Invalid payload received, ignoring:', typeof payload);
            return;
        }

        // If payload contains raw project data (nodes array), extract only what we need
        const cleanPayload = {
            type: payload.type || 'UPDATE',
            table: payload.table || 'project',
            schema: payload.schema || 'public'
        };

        log('Project updated via broadcast:', cleanPayload);

        // Call custom callback if provided (with clean payload)
        onProjectUpdate?.(cleanPayload);

        // Revalidate SWR cache to update UI
        try {
            const cacheKey = swrKey || `/api/projects/${projectId}`;
            mutate(cacheKey);
            log('Project cache revalidated:', cacheKey);
        } catch (error) {
            console.error('🔴 Error revalidating project:', error);
            setConnectionState(prev => ({
                ...prev,
                error: error instanceof Error ? error : new Error('Cache revalidation failed')
            }));
        }
    }, [projectId, swrKey, onProjectUpdate, log]);

    // Cleanup function
    const cleanup = useCallback(() => {
        log('Cleaning up realtime subscription');

        isSubscribingRef.current = false;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (channelRef.current && supabaseRef.current) {
            supabaseRef.current.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        setConnectionState(prev => ({
            ...prev,
            isConnected: false,
            isConnecting: false
        }));
    }, [log]);

    // Reconnection with exponential backoff
    const scheduleReconnect = useCallback((attempt: number) => {
        if (attempt >= maxReconnectAttempts) {
            log('Max reconnection attempts reached');
            setConnectionState(prev => ({
                ...prev,
                error: new Error(`Failed to connect after ${maxReconnectAttempts} attempts`),
                isConnecting: false
            }));
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s delay
        log(`Scheduling reconnect attempt ${attempt + 1} in ${delay}ms`);

        reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionState(prev => ({
                ...prev,
                reconnectAttempts: attempt + 1,
                isConnecting: true,
                error: null
            }));
        }, delay);
    }, [maxReconnectAttempts, log]);

    // Manual reconnect function
    const reconnect = useCallback(() => {
        log('Manual reconnect triggered');
        cleanup();
        setConnectionState(prev => ({
            ...prev,
            reconnectAttempts: 0,
            error: null,
            isConnecting: true
        }));
    }, [cleanup, log]);

    // Main subscription effect
    useEffect(() => {
        if (!projectId) {
            cleanup();
            return;
        }

        // Prevent duplicate subscriptions
        if (channelRef.current?.state === REALTIME_CHANNEL_STATES.joined || isSubscribingRef.current) {
            log('Already subscribed to project:', projectId);
            return;
        }

        isSubscribingRef.current = true;
        setConnectionState(prev => ({
            ...prev,
            isConnecting: true,
            error: null
        }));

        // Create and cache Supabase client
        if (!supabaseRef.current) {
            supabaseRef.current = createClient();
        }
        const supabase = supabaseRef.current;

        log('Subscribing to project realtime updates:', projectId);

        // Use broadcast with private channel for better scalability
        // Following naming convention: scope:entity:id
        const channel = supabase
            .channel(`project:${projectId}`, {
                config: {
                    broadcast: {
                        self: false, // Don't receive our own broadcasts
                        ack: true    // Get acknowledgment when server receives message
                    },
                    private: true, // Requires RLS policies on realtime.messages
                },
            })
            .on(
                'broadcast' as any,
                { event: 'project_updated' }, // Following snake_case convention
                handleProjectUpdate
            );

        channelRef.current = channel;

        // Get the current session and set auth before subscribing (required for private channels)
        supabase.auth.getSession()
            .then(({ data: { session }, error: sessionError }) => {
                if (sessionError) {
                    console.error('🔴 Error getting session:', sessionError.message);
                    isSubscribingRef.current = false;
                    setConnectionState(prev => ({
                        ...prev,
                        error: sessionError,
                        isConnecting: false
                    }));
                    return;
                }

                if (!session) {
                    const error = new Error('No active session - user must be logged in');
                    console.error('🔴', error.message);
                    isSubscribingRef.current = false;
                    setConnectionState(prev => ({
                        ...prev,
                        error,
                        isConnecting: false
                    }));
                    return;
                }

                log('Session found, setting auth for realtime', session.user.id);

                // Set auth with the current session token
                return supabase.realtime.setAuth(session.access_token);
            })
            .then(() => {
                log('Auth set for realtime');

                // Subscribe after auth is set
                return channel.subscribe((status, err) => {
                    // Reset subscription flag on any final state
                    const finalStates = [
                        REALTIME_SUBSCRIBE_STATES.SUBSCRIBED,
                        REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR,
                        REALTIME_SUBSCRIBE_STATES.TIMED_OUT,
                        REALTIME_SUBSCRIBE_STATES.CLOSED
                    ];

                    if (finalStates.includes(status)) {
                        isSubscribingRef.current = false;
                    }

                    switch (status) {
                        case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
                            log('Realtime subscription status: SUBSCRIBED ✅');
                            setConnectionState(prev => ({
                                ...prev,
                                isConnected: true,
                                isConnecting: false,
                                error: null,
                                lastConnectedAt: new Date(),
                                reconnectAttempts: 0
                            }));
                            break;

                        case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
                            console.error('🔴 Realtime subscription error:', err);
                            setConnectionState(prev => ({
                                ...prev,
                                isConnected: false,
                                isConnecting: false,
                                error: err instanceof Error ? err : new Error('Channel error')
                            }));
                            // Schedule reconnect on error
                            scheduleReconnect(connectionState.reconnectAttempts);
                            break;

                        case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
                            console.error('🔴 Realtime subscription timed out');
                            setConnectionState(prev => ({
                                ...prev,
                                isConnected: false,
                                isConnecting: false,
                                error: new Error('Connection timed out')
                            }));
                            // Schedule reconnect on timeout
                            scheduleReconnect(connectionState.reconnectAttempts);
                            break;

                        case REALTIME_SUBSCRIBE_STATES.CLOSED:
                            log('Realtime channel closed');
                            setConnectionState(prev => ({
                                ...prev,
                                isConnected: false,
                                isConnecting: false
                            }));
                            break;

                        default:
                            log('Realtime subscription status:', status);
                    }
                });
            })
            .catch((error) => {
                console.error('🔴 Error setting auth for realtime:', error);
                isSubscribingRef.current = false;
                setConnectionState(prev => ({
                    ...prev,
                    isConnected: false,
                    isConnecting: false,
                    error: error instanceof Error ? error : new Error('Auth setup failed')
                }));
                // Schedule reconnect on auth error
                scheduleReconnect(connectionState.reconnectAttempts);
            });

        // Cleanup on unmount or projectId change
        return cleanup;
    }, [projectId, handleProjectUpdate, cleanup, log, scheduleReconnect, connectionState.reconnectAttempts]);

    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    return {
        connectionState,
        reconnect,
        disconnect: cleanup
    };
}

/**
 * Simple hook that maintains backward compatibility
 * Uses the enhanced version internally but doesn't expose the state
 */
export function useProjectRealtime(projectId: string | undefined) {
    useProjectRealtimeEnhanced(projectId, { debug: false });
}