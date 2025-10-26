/**
 * useRealtimeSubscription - React hook for Supabase Realtime subscriptions
 * 
 * This hook provides a simple interface for subscribing to realtime events
 * using the RealtimeConnectionManager singleton. It handles:
 * - Automatic subscription on mount
 * - Automatic cleanup on unmount
 * - Connection state tracking
 * - Error handling
 * - Broadcast helper function
 * - Enable/disable state
 * 
 * Requirements: 1.2, 1.3, 3.1, 3.4
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
    RealtimeConnectionManager,
    type SubscriptionHandle,
    type ConnectionState,
    type ChannelOptions,
    RealtimeError
} from '@/lib/realtime-connection-manager';
import { realtimeLogger } from '@/lib/realtime-logger';

/**
 * Options for the useRealtimeSubscription hook
 */
export interface UseRealtimeSubscriptionOptions<T> {
    /** The topic/channel to subscribe to (e.g., 'room:123:messages') */
    topic: string;

    /** The event to listen for (e.g., 'message_created') */
    event: string;

    /** Callback function when a message is received */
    onMessage: (payload: T) => void;

    /** Whether the subscription is enabled (default: true) */
    enabled?: boolean;

    /** Whether to use a private channel (default: true) */
    private?: boolean;

    /** Whether to receive own broadcasts (default: false) */
    self?: boolean;

    /** Whether to request acknowledgment for broadcasts (default: true) */
    ack?: boolean;
}

/**
 * Return value from the useRealtimeSubscription hook
 */
export interface UseRealtimeSubscriptionReturn {
    /** Whether the channel is connected and subscribed */
    isConnected: boolean;

    /** Whether the subscription is currently active */
    isSubscribed: boolean;

    /** The current connection state */
    connectionState: ConnectionState;

    /** Any error that occurred during subscription */
    error: RealtimeError | null;

    /** Function to broadcast a message to the channel */
    broadcast: (event: string, payload: unknown) => Promise<void>;

    /** Function to manually retry subscription if in error state */
    retry: () => void;
}

/**
 * React hook for subscribing to Supabase Realtime events
 * 
 * @example
 * ```tsx
 * function ChatRoom({ roomId }: { roomId: string }) {
 *   const { isConnected, error, broadcast } = useRealtimeSubscription({
 *     topic: `room:${roomId}:messages`,
 *     event: 'message_created',
 *     onMessage: (payload) => {
 *       console.log('New message:', payload);
 *     },
 *     enabled: true,
 *     private: true
 *   });
 * 
 *   const sendMessage = async (text: string) => {
 *     await broadcast('message_created', { text, timestamp: Date.now() });
 *   };
 * 
 *   return (
 *     <div>
 *       {!isConnected && <div>Connecting...</div>}
 *       {error && <div>Error: {error.message}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeSubscription<T = any>(
    options: UseRealtimeSubscriptionOptions<T>
): UseRealtimeSubscriptionReturn {
    const {
        topic,
        event,
        onMessage,
        enabled = true,
        private: isPrivate = true,
        self = false,
        ack = true
    } = options;

    // State
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [error, setError] = useState<RealtimeError | null>(null);

    // Refs to track subscription and prevent double subscriptions
    const subscriptionHandleRef = useRef<SubscriptionHandle | null>(null);
    const isSubscribingRef = useRef(false);
    const managerRef = useRef<RealtimeConnectionManager | null>(null);

    // Stable callback reference
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    // Broadcast helper function
    const broadcast = useCallback(
        async (broadcastEvent: string, payload: unknown): Promise<void> => {
            if (!managerRef.current) {
                const error = new RealtimeError(
                    'CHANNEL_ERROR' as any,
                    'Manager not initialized',
                    { topic, event: broadcastEvent }
                );
                realtimeLogger.error('Cannot broadcast: manager not initialized', {
                    topic,
                    event: broadcastEvent
                });
                throw error;
            }

            if (!isSubscribed) {
                const error = new RealtimeError(
                    'CHANNEL_ERROR' as any,
                    'Not subscribed to channel',
                    { topic, event: broadcastEvent }
                );
                realtimeLogger.error('Cannot broadcast: not subscribed', {
                    topic,
                    event: broadcastEvent
                });
                throw error;
            }

            try {
                await managerRef.current.broadcast(topic, broadcastEvent, payload);
            } catch (err) {
                realtimeLogger.error('Broadcast failed', {
                    topic,
                    event: broadcastEvent,
                    error: err instanceof Error ? err.message : String(err)
                });
                throw err;
            }
        },
        [topic, isSubscribed]
    );

    // Subscribe function
    const subscribe = useCallback(async () => {
        // Prevent double subscription
        if (isSubscribingRef.current || subscriptionHandleRef.current) {
            realtimeLogger.warn('Subscription already in progress or active', {
                topic,
                event,
                isSubscribing: isSubscribingRef.current,
                hasHandle: !!subscriptionHandleRef.current
            });
            return;
        }

        isSubscribingRef.current = true;
        setError(null);
        setConnectionState('connecting');

        realtimeLogger.info('Starting subscription', {
            topic,
            event,
            enabled,
            private: isPrivate
        });

        try {
            // Get manager instance
            const manager = RealtimeConnectionManager.getInstance();
            managerRef.current = manager;

            // Subscribe with callback wrapper
            const handle = await manager.subscribe<T>(
                topic,
                event,
                (payload: T) => {
                    realtimeLogger.info('Message received', {
                        topic,
                        event,
                        payload
                    });
                    onMessageRef.current(payload);
                },
                {
                    private: isPrivate,
                    self,
                    ack
                } as ChannelOptions
            );

            subscriptionHandleRef.current = handle;
            setIsSubscribed(true);
            setConnectionState('connected');

            realtimeLogger.success('Subscription successful', {
                topic,
                event,
                handleId: handle.id
            });
        } catch (err) {
            const realtimeError = err instanceof RealtimeError
                ? err
                : new RealtimeError(
                    'SUBSCRIPTION_FAILED' as any,
                    'Failed to subscribe',
                    {
                        topic,
                        event,
                        originalError: err instanceof Error ? err.message : String(err)
                    }
                );

            setError(realtimeError);
            setConnectionState('error');
            setIsSubscribed(false);

            realtimeLogger.error('Subscription failed', realtimeError.toJSON());
        } finally {
            isSubscribingRef.current = false;
        }
    }, [topic, event, enabled, isPrivate, self, ack]);

    // Unsubscribe function
    const unsubscribe = useCallback(async () => {
        if (!subscriptionHandleRef.current || !managerRef.current) {
            return;
        }

        realtimeLogger.info('Unsubscribing', {
            topic,
            event,
            handleId: subscriptionHandleRef.current.id
        });

        try {
            await managerRef.current.unsubscribe(subscriptionHandleRef.current);

            realtimeLogger.success('Unsubscribed successfully', {
                topic,
                event
            });
        } catch (err) {
            realtimeLogger.error('Error during unsubscribe', {
                topic,
                event,
                error: err instanceof Error ? err.message : String(err)
            });
        } finally {
            subscriptionHandleRef.current = null;
            setIsSubscribed(false);
            setConnectionState('disconnected');
        }
    }, [topic, event]);

    // Retry function for manual retry
    const retry = useCallback(() => {
        realtimeLogger.info('Manual retry requested', { topic, event });

        // Clear error state
        setError(null);

        // Unsubscribe if currently subscribed
        if (subscriptionHandleRef.current) {
            unsubscribe();
        }

        // Reset flags
        isSubscribingRef.current = false;

        // Attempt to subscribe again
        subscribe();
    }, [topic, event, subscribe, unsubscribe]);

    // Effect to handle subscription lifecycle
    useEffect(() => {
        // Only subscribe if enabled
        if (!enabled) {
            realtimeLogger.info('Subscription disabled', { topic, event });

            // Unsubscribe if currently subscribed
            if (subscriptionHandleRef.current) {
                unsubscribe();
            }

            return;
        }

        // Subscribe
        subscribe();

        // Cleanup on unmount or when dependencies change
        return () => {
            realtimeLogger.info('Cleaning up subscription', { topic, event });
            unsubscribe();
        };
    }, [enabled, topic, event, subscribe, unsubscribe]);

    // Derived state
    const isConnected = isSubscribed && connectionState === 'connected';

    return {
        isConnected,
        isSubscribed,
        connectionState,
        error,
        broadcast,
        retry
    };
}
