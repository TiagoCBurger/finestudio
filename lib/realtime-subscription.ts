/**
 * Shared utility for managing Supabase Realtime subscriptions
 * 
 * This module provides reusable functions for handling:
 * - Debouncing subscription attempts
 * - Retry logic with exponential backoff
 * - State management for subscriptions
 * - Proper cleanup and error handling
 * 
 * Following Supabase Realtime best practices:
 * - Use broadcast for better scalability
 * - Use private channels for security
 * - Implement proper error handling and reconnection
 * - Check channel state before subscribing
 */

import { createClient } from '@/lib/supabase/client';
import {
    REALTIME_SUBSCRIBE_STATES,
    REALTIME_CHANNEL_STATES,
    type RealtimeChannel,
    type SupabaseClient
} from '@supabase/supabase-js';
import { realtimeLogger } from '@/lib/realtime-logger';

/**
 * Configuration constants for subscription management
 */
export const REALTIME_CONFIG = {
    DEBOUNCE_DELAY: 500, // ms - Delay before attempting subscription
    MAX_RETRIES: 3, // Maximum number of retry attempts
    RETRY_DELAYS: [1000, 2000, 4000], // ms - Exponential backoff delays
} as const;

/**
 * Subscription state tracking
 */
export interface SubscriptionState {
    isSubscribing: boolean;
    isSubscribed: boolean;
    retryCount: number;
    lastAttemptTimestamp: number | null;
}

/**
 * Initial subscription state
 */
export const createInitialSubscriptionState = (): SubscriptionState => ({
    isSubscribing: false,
    isSubscribed: false,
    retryCount: 0,
    lastAttemptTimestamp: null,
});

/**
 * Channel configuration options
 */
export interface ChannelConfig {
    topic: string;
    broadcast?: {
        self?: boolean;
        ack?: boolean;
    };
    private?: boolean;
}

/**
 * Subscription options
 */
export interface SubscriptionOptions<T = any> {
    channelConfig: ChannelConfig;
    events: Array<{
        event: string;
        handler: (payload: T) => void;
    }>;
    onStatusChange?: (status: string, error?: Error) => void;
    contextId?: string; // For logging (e.g., projectId, userId)
}

/**
 * Subscription manager return type
 */
export interface SubscriptionManager {
    channel: RealtimeChannel | null;
    state: SubscriptionState;
    cleanup: () => void;
}

/**
 * Check if a subscription should be attempted based on current state
 * 
 * @param state Current subscription state
 * @param channel Current channel reference
 * @param contextId Context identifier for logging
 * @returns true if subscription should proceed, false otherwise
 */
export function shouldAttemptSubscription(
    state: SubscriptionState,
    channel: RealtimeChannel | null,
    contextId?: string
): boolean {
    const now = Date.now();
    const channelState = channel?.state;
    const isChannelJoined = channelState === REALTIME_CHANNEL_STATES.joined;
    const isAlreadySubscribed = isChannelJoined || state.isSubscribed;

    // Check if we're already in the process of subscribing
    if (state.isSubscribing) {
        realtimeLogger.info('Subscription already in progress, skipping', {
            contextId,
            channelState,
            subscriptionState: state
        });
        return false;
    }

    // Check if already subscribed
    if (isAlreadySubscribed) {
        realtimeLogger.info('Already subscribed, skipping', {
            contextId,
            channelState,
            isChannelJoined,
            subscriptionState: state
        });
        return false;
    }

    // Check if we should wait before retrying (timestamp verification)
    if (state.lastAttemptTimestamp) {
        const timeSinceLastAttempt = now - state.lastAttemptTimestamp;
        const minRetryDelay = state.retryCount > 0
            ? REALTIME_CONFIG.RETRY_DELAYS[Math.min(state.retryCount - 1, REALTIME_CONFIG.RETRY_DELAYS.length - 1)]
            : 0;

        if (timeSinceLastAttempt < minRetryDelay) {
            realtimeLogger.info('Too soon to retry, waiting', {
                contextId,
                timeSinceLastAttempt,
                minRetryDelay,
                retryCount: state.retryCount
            });
            return false;
        }
    }

    // Check if we've exceeded max retries
    if (state.retryCount >= REALTIME_CONFIG.MAX_RETRIES) {
        realtimeLogger.error('Max retries exceeded, giving up', {
            contextId,
            retryCount: state.retryCount,
            maxRetries: REALTIME_CONFIG.MAX_RETRIES
        });
        return false;
    }

    return true;
}

/**
 * Create a Realtime channel with the specified configuration
 * 
 * @param supabase Supabase client instance
 * @param config Channel configuration
 * @param events Event handlers to attach
 * @returns Configured RealtimeChannel
 */
export function createRealtimeChannel<T = any>(
    supabase: SupabaseClient,
    config: ChannelConfig,
    events: Array<{ event: string; handler: (payload: T) => void }>
): RealtimeChannel {
    const { topic, broadcast = { self: false, ack: true }, private: isPrivate = true } = config;

    const channel = supabase.channel(topic, {
        config: {
            broadcast,
            private: isPrivate,
        },
    });

    // Attach event handlers
    events.forEach(({ event, handler }) => {
        channel.on('broadcast' as any, { event }, handler);
    });

    return channel;
}

/**
 * Handle subscription status changes with proper state updates
 * 
 * @param status Subscription status
 * @param error Optional error object
 * @param state Current subscription state
 * @param contextId Context identifier for logging
 * @param onStatusChange Optional callback for status changes
 * @returns Updated subscription state
 */
export function handleSubscriptionStatus(
    status: string,
    error: Error | undefined,
    state: SubscriptionState,
    contextId?: string,
    onStatusChange?: (status: string, error?: Error) => void
): SubscriptionState {
    const logContext = {
        contextId,
        retryCount: state.retryCount,
        status,
        error
    };

    realtimeLogger.info('Subscription status update', logContext);

    // Call optional status change callback
    if (onStatusChange) {
        onStatusChange(status, error);
    }

    switch (status) {
        case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
            realtimeLogger.success('SUBSCRIBED - Successfully connected', { contextId });
            return {
                isSubscribing: false,
                isSubscribed: true,
                retryCount: 0, // Reset retry count on success
                lastAttemptTimestamp: Date.now()
            };

        case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
            realtimeLogger.error('CHANNEL_ERROR - Subscription failed', {
                ...logContext,
                errorMessage: error?.message || 'Unknown error',
                note: 'Will retry with exponential backoff'
            });
            return {
                isSubscribing: false,
                isSubscribed: false,
                retryCount: state.retryCount + 1,
                lastAttemptTimestamp: Date.now()
            };

        case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
            realtimeLogger.error('TIMED_OUT - Subscription attempt timed out', {
                ...logContext,
                note: 'Will retry with exponential backoff',
                nextRetryDelay: REALTIME_CONFIG.RETRY_DELAYS[Math.min(state.retryCount, REALTIME_CONFIG.RETRY_DELAYS.length - 1)]
            });
            return {
                isSubscribing: false,
                isSubscribed: false,
                retryCount: state.retryCount + 1,
                lastAttemptTimestamp: Date.now()
            };

        case REALTIME_SUBSCRIBE_STATES.CLOSED:
            realtimeLogger.info('CLOSED - Channel connection closed', { contextId });
            return {
                isSubscribing: false,
                isSubscribed: false,
                retryCount: state.retryCount,
                lastAttemptTimestamp: Date.now()
            };

        default:
            realtimeLogger.info('Status update', logContext);
            return state;
    }
}

/**
 * Subscribe to a Realtime channel with authentication and error handling
 * 
 * This function handles:
 * - Getting the current session
 * - Setting auth for private channels
 * - Subscribing to the channel
 * - Handling subscription status changes
 * 
 * @param supabase Supabase client instance
 * @param channel Channel to subscribe to
 * @param state Current subscription state
 * @param stateUpdater Function to update subscription state
 * @param contextId Context identifier for logging
 * @param onStatusChange Optional callback for status changes
 */
export async function subscribeToChannel(
    supabase: SupabaseClient,
    channel: RealtimeChannel,
    state: SubscriptionState,
    stateUpdater: (updater: (prev: SubscriptionState) => SubscriptionState) => void,
    contextId?: string,
    onStatusChange?: (status: string, error?: Error) => void
): Promise<void> {
    try {
        realtimeLogger.info('Getting session for authentication', {
            contextId,
            retryCount: state.retryCount
        });

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            realtimeLogger.error('Error getting session', {
                contextId,
                error: sessionError.message,
                retryCount: state.retryCount
            });
            stateUpdater(prev => ({ ...prev, isSubscribing: false }));
            return;
        }

        if (!session) {
            realtimeLogger.error('No active session found', {
                contextId,
                note: 'User must be logged in to use private channels',
                retryCount: state.retryCount
            });
            stateUpdater(prev => ({ ...prev, isSubscribing: false }));
            return;
        }

        realtimeLogger.info('Session found, setting auth for realtime', {
            contextId,
            sessionUserId: session.user.id,
            retryCount: state.retryCount
        });

        // Set auth with the current session token
        await supabase.realtime.setAuth(session.access_token);

        realtimeLogger.info('Auth set for realtime, subscribing to channel', {
            contextId,
            retryCount: state.retryCount
        });

        // Subscribe to the channel
        channel.subscribe((status, err) => {
            stateUpdater(prev =>
                handleSubscriptionStatus(status, err, prev, contextId, onStatusChange)
            );
        });
    } catch (error) {
        realtimeLogger.error('Error during subscription process', {
            contextId,
            error: error instanceof Error ? error.message : error,
            retryCount: state.retryCount
        });
        stateUpdater(prev => ({
            isSubscribing: false,
            isSubscribed: false,
            retryCount: prev.retryCount + 1,
            lastAttemptTimestamp: Date.now()
        }));
    }
}

/**
 * Create a debounced subscription manager
 * 
 * This is the main function to use for managing Realtime subscriptions.
 * It handles all the complexity of debouncing, retry logic, and state management.
 * 
 * @param options Subscription options
 * @returns Cleanup function
 */
export function createDebouncedSubscription<T = any>(
    options: SubscriptionOptions<T>
): () => void {
    let debounceTimer: NodeJS.Timeout | null = null;
    let channel: RealtimeChannel | null = null;
    let supabase: SupabaseClient | null = null;
    let state: SubscriptionState = createInitialSubscriptionState();

    const { channelConfig, events, onStatusChange, contextId } = options;

    // State updater function
    const updateState = (updater: (prev: SubscriptionState) => SubscriptionState) => {
        state = updater(state);
    };

    // Schedule subscription attempt with debouncing
    const scheduleSubscription = () => {
        // Clear any pending debounce timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        realtimeLogger.info('Scheduling subscription attempt with debounce', {
            contextId,
            debounceDelay: REALTIME_CONFIG.DEBOUNCE_DELAY,
            currentState: state
        });

        debounceTimer = setTimeout(async () => {
            // Check if we should attempt subscription
            if (!shouldAttemptSubscription(state, channel, contextId)) {
                return;
            }

            // Update subscription state
            state = {
                ...state,
                isSubscribing: true,
                lastAttemptTimestamp: Date.now()
            };

            realtimeLogger.info('Starting subscription attempt', {
                contextId,
                attemptNumber: state.retryCount + 1,
                maxRetries: REALTIME_CONFIG.MAX_RETRIES,
                channelState: channel?.state,
                timestamp: Date.now()
            });

            // Create and cache Supabase client
            if (!supabase) {
                supabase = createClient();
            }

            // Create channel
            channel = createRealtimeChannel(supabase, channelConfig, events);

            realtimeLogger.info('Channel created, starting subscription process', {
                contextId,
                channelTopic: channelConfig.topic
            });

            // Subscribe to channel with authentication
            await subscribeToChannel(
                supabase,
                channel,
                state,
                updateState,
                contextId,
                onStatusChange
            );
        }, REALTIME_CONFIG.DEBOUNCE_DELAY);
    };

    // Start the subscription process
    scheduleSubscription();

    // Return cleanup function
    return () => {
        realtimeLogger.info('Cleaning up subscription', {
            contextId,
            channelState: channel?.state,
            subscriptionState: state
        });

        // Clear debounce timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }

        // Reset subscription state
        state = createInitialSubscriptionState();

        // Remove channel
        if (channel && supabase) {
            supabase.removeChannel(channel);
            channel = null;
            realtimeLogger.success('Channel removed successfully', { contextId });
        }
    };
}
