'use client';

import { useCallback } from 'react';
import { mutate } from 'swr';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { realtimeLogger } from '@/lib/realtime-logger';

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
 * Subscription state tracking (for backward compatibility)
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
 * Uses the new RealtimeConnectionManager for centralized connection management
 * Follows Supabase Realtime best practices with proper error handling and cleanup
 * 
 * @param projectId - The ID of the project to subscribe to
 * @returns Object containing subscription state and retry method
 */
export function useProjectRealtime(projectId: string | undefined): UseProjectRealtimeReturn {
    // Memoized handler for project updates
    const handleProjectUpdate = useCallback((payload: ProjectUpdatePayload) => {
        const timestamp = new Date().toISOString();

        // [DIAGNOSTIC] Log broadcast received with full details
        console.log('[REALTIME-DIAGNOSTIC] ProjectRealtime broadcast received:', {
            timestamp,
            projectId,
            type: payload?.type,
            hasNew: !!payload?.new,
            hasOld: !!payload?.old,
            table: payload?.table,
            schema: payload?.schema,
            payloadType: typeof payload,
        });

        // Enhanced broadcast receive logging (sanitized for security)
        realtimeLogger.info('📨 Broadcast received', realtimeLogger.createContext({
            projectId,
            payloadType: typeof payload,
            hasPayload: !!payload,
            payloadKeys: payload ? Object.keys(payload).filter(k => !['new', 'old'].includes(k)) : []
        }));

        // [DIAGNOSTIC] Payload validation logging
        if (!payload || typeof payload !== 'object') {
            console.warn('[REALTIME-DIAGNOSTIC] Invalid payload received:', {
                timestamp,
                projectId,
                payloadType: typeof payload,
                payload: payload,
            });

            realtimeLogger.warn('Invalid payload received, ignoring', {
                projectId,
                payloadType: typeof payload,
                hint: 'Check database trigger function is sending correct payload structure'
            });
            return;
        }

        // [DIAGNOSTIC] Log payload structure details
        console.log('[REALTIME-DIAGNOSTIC] Payload validation passed:', {
            timestamp,
            projectId,
            type: payload.type,
            table: payload.table,
            schema: payload.schema,
            hasNew: !!payload.new,
            hasOld: !!payload.old,
            newKeys: payload.new ? Object.keys(payload.new) : [],
            oldKeys: payload.old ? Object.keys(payload.old) : [],
        });

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
        // This triggers a refetch of the project data from the API
        try {
            const mutateTimestamp = new Date().toISOString();
            const cacheKey = `/api/projects/${projectId}`;

            // [DIAGNOSTIC] Log before calling mutate()
            console.log('[REALTIME-DIAGNOSTIC] Calling mutate() BEFORE:', {
                timestamp: mutateTimestamp,
                projectId,
                cacheKey,
                revalidate: true,
                optimisticData: undefined,
            });

            realtimeLogger.info('🔄 Calling mutate() to revalidate project cache', {
                projectId,
                cacheKey,
                timestamp: mutateTimestamp
            });

            // Force revalidation by calling mutate with undefined data and revalidate: true
            // This will trigger SWR to refetch the data from the API
            // The revalidate option ensures a fresh fetch even if the cache is valid
            mutate(cacheKey, undefined, { revalidate: true });

            // [DIAGNOSTIC] Log after mutate() success
            console.log('[REALTIME-DIAGNOSTIC] mutate() called successfully AFTER:', {
                timestamp: new Date().toISOString(),
                projectId,
                cacheKey,
                success: true,
                timeSinceBroadcast: Date.now() - new Date(timestamp).getTime(),
            });

            realtimeLogger.success('✅ mutate() called successfully', {
                projectId,
                timestamp: mutateTimestamp
            });
        } catch (error) {
            // [DIAGNOSTIC] Log mutate() failure
            console.error('[REALTIME-DIAGNOSTIC] mutate() FAILED:', {
                timestamp: new Date().toISOString(),
                projectId,
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
            });

            realtimeLogger.error('❌ Error calling mutate()', realtimeLogger.createContext({
                projectId,
                error: error instanceof Error ? error.message : error,
                hint: 'Check SWR configuration and API endpoint availability'
            }));
        }
    }, [projectId]);

    // Subscribe to UPDATE events (most common for project changes)
    // Note: The database trigger sends INSERT, UPDATE, and DELETE events
    // We're subscribing to UPDATE as it's the primary event for project modifications
    // Following Supabase best practices: private channels for database triggers, no self-broadcast
    const { isConnected, isSubscribed, connectionState, error, retry } = useRealtimeSubscription<ProjectUpdatePayload>({
        topic: `project:${projectId}`,
        event: 'UPDATE',
        onMessage: handleProjectUpdate,
        enabled: !!projectId,
        private: true,  // Required for RLS authorization
        self: false,    // Don't receive own broadcasts
        ack: true       // Request acknowledgment
    });

    // Map new hook state to old API for backward compatibility
    const subscriptionState: SubscriptionState = {
        isSubscribing: connectionState === 'connecting',
        isSubscribed: isSubscribed,
        retryCount: 0, // Not tracked in new implementation
        lastAttemptTimestamp: null, // Not tracked in new implementation
        lastError: error ? {
            message: error.message,
            timestamp: Date.now(),
            status: error.type,
            hint: error.context?.hint as string | undefined
        } : undefined
    };

    // Return subscription state and retry method for backward compatibility
    return {
        subscriptionState,
        retrySubscription: retry
    };
}