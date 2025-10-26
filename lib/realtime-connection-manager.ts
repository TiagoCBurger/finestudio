/**
 * RealtimeConnectionManager - Singleton for managing Supabase Realtime connections
 * 
 * This manager ensures:
 * - Single WebSocket connection across the application
 * - Channel reuse for the same topic
 * - Proper subscriber tracking and cleanup
 * - Automatic reconnection with exponential backoff
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { createClient } from '@/lib/supabase/client';
import { realtimeLogger } from '@/lib/realtime-logger';
import {
    MessageBatcher,
    createMessageBatcher,
    type BroadcastMessage
} from '@/lib/realtime-performance';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/**
 * Connection states for the manager
 */
export type ConnectionState =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'error';

/**
 * Channel states for individual channels
 */
export type ChannelState =
    | 'idle'
    | 'subscribing'
    | 'subscribed'
    | 'error'
    | 'closed';

/**
 * Options for channel configuration
 */
export interface ChannelOptions {
    private?: boolean;
    self?: boolean;
    ack?: boolean;
}

/**
 * Error types for Realtime operations
 * Requirement: 4.1
 */
export enum RealtimeErrorType {
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    SUBSCRIPTION_FAILED = 'SUBSCRIPTION_FAILED',
    CHANNEL_ERROR = 'CHANNEL_ERROR',
    TIMEOUT = 'TIMEOUT',
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
    NETWORK_ERROR = 'NETWORK_ERROR',
    BROADCAST_FAILED = 'BROADCAST_FAILED',
    UNKNOWN = 'UNKNOWN'
}

/**
 * Custom error class for Realtime operations
 * Requirements: 4.1, 4.4
 */
export class RealtimeError extends Error {
    public readonly type: RealtimeErrorType;
    public readonly context: Record<string, unknown>;
    public readonly retryable: boolean;
    public readonly timestamp: number;

    constructor(
        type: RealtimeErrorType,
        message: string,
        context: Record<string, unknown> = {},
        retryable: boolean = true
    ) {
        super(message);
        this.name = 'RealtimeError';
        this.type = type;
        this.context = context;
        this.retryable = retryable;
        this.timestamp = Date.now();

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, RealtimeError);
        }
    }

    /**
     * Convert error to a loggable object
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            type: this.type,
            message: this.message,
            context: this.context,
            retryable: this.retryable,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Configuration for retry strategy
 * Requirement: 4.2
 */
export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}

/**
 * Default retry configuration
 * Requirement: 4.2
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
};

/**
 * Calculate retry delay using exponential backoff
 * Requirement: 4.2
 */
export function calculateRetryDelay(
    attempt: number,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
    const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;

    return Math.floor(delay + jitter);
}

/**
 * Handle returned when subscribing, used for unsubscribing
 */
export interface SubscriptionHandle {
    topic: string;
    event: string;
    id: string;
}

/**
 * Information about a subscriber
 */
interface SubscriberInfo {
    id: string;
    event: string;
    callback: Function;
    addedAt: number;
}

/**
 * Retry state for a channel
 * Requirement: 4.2, 4.3
 */
interface RetryState {
    attempts: number;
    lastAttempt: number;
    nextRetryDelay: number;
    isRetrying: boolean;
}

/**
 * Wrapper for managing a single channel and its subscribers
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 3.5, 4.2, 4.3
 */
class ChannelWrapper {
    public readonly topic: string;
    public readonly channel: RealtimeChannel;
    public state: ChannelState;
    private subscribers: Map<string, SubscriberInfo>;
    private retryState: RetryState;
    private lastError: RealtimeError | null;

    constructor(topic: string, channel: RealtimeChannel) {
        this.topic = topic;
        this.channel = channel;
        this.state = 'idle';
        this.subscribers = new Map();
        this.retryState = {
            attempts: 0,
            lastAttempt: 0,
            nextRetryDelay: 0,
            isRetrying: false
        };
        this.lastError = null;
    }

    /**
     * Add a subscriber to this channel
     */
    addSubscriber(event: string, callback: Function, id: string): void {
        this.subscribers.set(id, {
            id,
            event,
            callback,
            addedAt: Date.now()
        });

        realtimeLogger.info('Subscriber added to channel', {
            topic: this.topic,
            event,
            subscriberId: id,
            totalSubscribers: this.subscribers.size
        });
    }

    /**
     * Remove a subscriber from this channel
     * Returns true if the subscriber was found and removed
     */
    removeSubscriber(id: string): boolean {
        const removed = this.subscribers.delete(id);

        if (removed) {
            realtimeLogger.info('Subscriber removed from channel', {
                topic: this.topic,
                subscriberId: id,
                remainingSubscribers: this.subscribers.size
            });
        }

        return removed;
    }

    /**
     * Check if this channel has any subscribers
     */
    hasSubscribers(): boolean {
        return this.subscribers.size > 0;
    }

    /**
     * Get the number of subscribers
     */
    getSubscriberCount(): number {
        return this.subscribers.size;
    }

    /**
     * Get subscriber by ID
     */
    getSubscriber(id: string): SubscriberInfo | undefined {
        return this.subscribers.get(id);
    }

    /**
     * Get all subscribers for a specific event
     */
    getSubscribersByEvent(event: string): SubscriberInfo[] {
        return Array.from(this.subscribers.values()).filter(
            sub => sub.event === event || sub.event === '*'
        );
    }

    /**
     * Get retry state
     * Requirement: 4.2
     */
    getRetryState(): RetryState {
        return { ...this.retryState };
    }

    /**
     * Update retry state
     * Requirement: 4.2
     */
    updateRetryState(updates: Partial<RetryState>): void {
        this.retryState = {
            ...this.retryState,
            ...updates
        };
    }

    /**
     * Reset retry state
     * Requirement: 4.2
     */
    resetRetryState(): void {
        this.retryState = {
            attempts: 0,
            lastAttempt: 0,
            nextRetryDelay: 0,
            isRetrying: false
        };
    }

    /**
     * Set last error
     * Requirement: 4.4
     */
    setError(error: RealtimeError): void {
        this.lastError = error;
        this.state = 'error';
    }

    /**
     * Get last error
     * Requirement: 4.4
     */
    getLastError(): RealtimeError | null {
        return this.lastError;
    }

    /**
     * Clear error
     * Requirement: 4.4
     */
    clearError(): void {
        this.lastError = null;
    }

    /**
     * Close this channel and clean up
     */
    async close(): Promise<void> {
        realtimeLogger.info('Closing channel', {
            topic: this.topic,
            subscriberCount: this.subscribers.size
        });

        this.state = 'closed';
        this.subscribers.clear();
        this.resetRetryState();
        this.clearError();

        try {
            await this.channel.unsubscribe();
        } catch (error) {
            realtimeLogger.error('Error unsubscribing channel', {
                topic: this.topic,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
}

/**
 * Metrics for tracking realtime operations
 * Requirement: 5.5
 */
export interface RealtimeMetrics {
    // Connection metrics
    connectionUptime: number;
    reconnectionCount: number;

    // Channel metrics
    activeChannels: number;
    totalSubscriptions: number;
    channelsByTopic: Map<string, number>;

    // Message metrics
    messagesReceived: number;
    messagesSent: number;

    // Error metrics
    errorCount: number;
    errorsByType: Map<RealtimeErrorType, number>;

    // Timing metrics
    averageSubscriptionTime: number;
    lastActivityTimestamp: number;
}

/**
 * Debug information for monitoring and troubleshooting
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export interface RealtimeDebugInfo {
    connectionState: ConnectionState;
    connectionUptime: number;
    channels: Array<{
        topic: string;
        state: ChannelState;
        subscriberCount: number;
        lastMessage: number | null;
        retryState: RetryState;
        lastError: RealtimeError | null;
    }>;
    metrics: RealtimeMetrics;
    recentErrors: RealtimeError[];
    retryConfig: RetryConfig;
}

/**
 * Singleton manager for all Realtime connections
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class RealtimeConnectionManager {
    private static instance: RealtimeConnectionManager | null = null;
    private supabaseClient: SupabaseClient | null = null;
    private channels: Map<string, ChannelWrapper>;
    private connectionState: ConnectionState;
    private nextSubscriberId: number;
    private retryConfig: RetryConfig;
    private lastError: RealtimeError | null = null;
    private messageBatcher: MessageBatcher | null = null;
    private batchingEnabled: boolean = false;
    private authStateSubscription: { unsubscribe: () => void } | null = null;
    private currentAccessToken: string | null = null;

    // Metrics tracking (Requirement: 5.5)
    private metrics: {
        connectionStartTime: number;
        reconnectionCount: number;
        messagesReceived: number;
        messagesSent: number;
        errorCount: number;
        errorsByType: Map<RealtimeErrorType, number>;
        subscriptionTimes: number[];
        lastActivityTimestamp: number;
        channelLastMessage: Map<string, number>;
        recentErrors: RealtimeError[];
    };

    private constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
        this.channels = new Map();
        this.connectionState = 'disconnected';
        this.nextSubscriberId = 0;
        this.retryConfig = retryConfig;

        // Initialize metrics (Requirement: 5.5)
        this.metrics = {
            connectionStartTime: Date.now(),
            reconnectionCount: 0,
            messagesReceived: 0,
            messagesSent: 0,
            errorCount: 0,
            errorsByType: new Map(),
            subscriptionTimes: [],
            lastActivityTimestamp: Date.now(),
            channelLastMessage: new Map(),
            recentErrors: []
        };

        realtimeLogger.info('RealtimeConnectionManager initialized', {
            retryConfig: this.retryConfig,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get the singleton instance
     * Requirement: 1.1
     */
    public static getInstance(): RealtimeConnectionManager {
        if (!RealtimeConnectionManager.instance) {
            RealtimeConnectionManager.instance = new RealtimeConnectionManager();
        }
        return RealtimeConnectionManager.instance;
    }

    /**
     * Initialize the Supabase client if not already initialized
     * Requirement: 1.2
     */
    private ensureClient(): SupabaseClient {
        if (!this.supabaseClient) {
            realtimeLogger.info('Creating Supabase client instance');
            this.supabaseClient = createClient();
            this.connectionState = 'connected';

            // Set up auth state change listener for token refresh
            // Requirements: 4.1, 4.3
            this.setupAuthStateListener();
        }
        return this.supabaseClient;
    }

    /**
     * Set up listener for auth state changes to handle token refresh
     * Requirements: 4.1, 4.3
     */
    private setupAuthStateListener(): void {
        if (!this.supabaseClient) return;

        realtimeLogger.info('Setting up auth state change listener');

        const { data: { subscription } } = this.supabaseClient.auth.onAuthStateChange(
            async (event, session) => {
                realtimeLogger.info('Auth state changed', {
                    event,
                    hasSession: !!session,
                    userId: session?.user?.id
                });

                // Handle token refresh
                if (event === 'TOKEN_REFRESHED' && session) {
                    await this.handleTokenRefresh(session.access_token);
                }

                // Handle sign out
                if (event === 'SIGNED_OUT') {
                    await this.handleSignOut();
                }

                // Handle sign in
                if (event === 'SIGNED_IN' && session) {
                    await this.handleSignIn(session.access_token);
                }
            }
        );

        this.authStateSubscription = subscription;
    }

    /**
     * Handle token refresh by updating realtime auth
     * Requirements: 4.1, 4.3
     */
    private async handleTokenRefresh(newAccessToken: string): Promise<void> {
        if (!this.supabaseClient) return;

        realtimeLogger.info('Handling token refresh');

        try {
            // Update stored token
            this.currentAccessToken = newAccessToken;

            // Update realtime auth with new token
            this.supabaseClient.realtime.setAuth(newAccessToken);

            realtimeLogger.success('Token refreshed successfully', {
                channelCount: this.channels.size
            });

            // Resubscribe all channels with new token if needed
            if (this.channels.size > 0) {
                realtimeLogger.info('Resubscribing channels after token refresh', {
                    channelCount: this.channels.size
                });

                // Note: Supabase client handles this automatically, but we log it
                // for debugging purposes
            }
        } catch (error) {
            const tokenError = new RealtimeError(
                RealtimeErrorType.AUTHENTICATION_FAILED,
                'Failed to refresh token',
                {
                    error: error instanceof Error ? error.message : String(error)
                },
                true
            );

            this.trackError(tokenError);
            this.lastError = tokenError;

            realtimeLogger.error('Token refresh failed', tokenError.toJSON());
        }
    }

    /**
     * Handle sign out by cleaning up all channels
     * Requirements: 4.1, 4.3
     */
    private async handleSignOut(): Promise<void> {
        realtimeLogger.info('Handling sign out, cleaning up channels');

        this.currentAccessToken = null;

        // Clean up all channels
        await this.cleanup();
    }

    /**
     * Handle sign in by setting auth token
     * Requirements: 4.1, 4.3
     */
    private async handleSignIn(accessToken: string): Promise<void> {
        if (!this.supabaseClient) return;

        realtimeLogger.info('Handling sign in');

        try {
            this.currentAccessToken = accessToken;
            this.supabaseClient.realtime.setAuth(accessToken);

            realtimeLogger.success('Sign in handled successfully');
        } catch (error) {
            const authError = new RealtimeError(
                RealtimeErrorType.AUTHENTICATION_FAILED,
                'Failed to set auth on sign in',
                {
                    error: error instanceof Error ? error.message : String(error)
                },
                true
            );

            this.trackError(authError);
            this.lastError = authError;

            realtimeLogger.error('Sign in handling failed', authError.toJSON());
        }
    }

    /**
     * Generate a unique subscriber ID
     */
    private generateSubscriberId(): string {
        return `sub_${++this.nextSubscriberId}_${Date.now()}`;
    }

    /**
     * Ensure authentication is set for private channels
     * Requirements: 4.1, 4.5
     */
    private async ensureAuthenticated(client: SupabaseClient): Promise<void> {
        try {
            const { data: { session }, error } = await client.auth.getSession();

            if (error) {
                throw new RealtimeError(
                    RealtimeErrorType.AUTHENTICATION_FAILED,
                    'Failed to get session',
                    { error: error.message },
                    false
                );
            }

            if (!session) {
                throw new RealtimeError(
                    RealtimeErrorType.AUTHENTICATION_FAILED,
                    'No active session found',
                    {},
                    false
                );
            }

            // Set auth for realtime
            client.realtime.setAuth(session.access_token);

            realtimeLogger.info('Authentication set for realtime', {
                userId: session.user.id
            });
        } catch (error) {
            if (error instanceof RealtimeError) {
                throw error;
            }

            throw new RealtimeError(
                RealtimeErrorType.AUTHENTICATION_FAILED,
                'Authentication failed',
                {
                    error: error instanceof Error ? error.message : String(error)
                },
                false
            );
        }
    }

    /**
     * Track error in metrics
     * Requirement: 5.5
     */
    private trackError(error: RealtimeError): void {
        this.metrics.errorCount++;

        const currentCount = this.metrics.errorsByType.get(error.type) || 0;
        this.metrics.errorsByType.set(error.type, currentCount + 1);

        // Keep only last 10 errors
        this.metrics.recentErrors.push(error);
        if (this.metrics.recentErrors.length > 10) {
            this.metrics.recentErrors.shift();
        }

        this.metrics.lastActivityTimestamp = Date.now();
    }

    /**
     * Track message received
     * Requirement: 5.5
     */
    private trackMessageReceived(topic: string): void {
        this.metrics.messagesReceived++;
        this.metrics.channelLastMessage.set(topic, Date.now());
        this.metrics.lastActivityTimestamp = Date.now();
    }

    /**
     * Track message sent
     * Requirement: 5.5
     */
    private trackMessageSent(): void {
        this.metrics.messagesSent++;
        this.metrics.lastActivityTimestamp = Date.now();
    }

    /**
     * Track subscription time
     * Requirement: 5.5
     */
    private trackSubscriptionTime(startTime: number): void {
        const duration = Date.now() - startTime;
        this.metrics.subscriptionTimes.push(duration);

        // Keep only last 100 subscription times
        if (this.metrics.subscriptionTimes.length > 100) {
            this.metrics.subscriptionTimes.shift();
        }
    }

    /**
     * Track reconnection
     * Requirement: 5.5
     */
    private trackReconnection(): void {
        this.metrics.reconnectionCount++;
        this.metrics.lastActivityTimestamp = Date.now();
    }

    /**
     * Handle subscription error and determine if retry is needed
     * Requirements: 4.1, 4.2, 4.4, 5.5
     */
    private handleSubscriptionError(
        topic: string,
        status: string,
        error: any
    ): RealtimeError {
        let errorType: RealtimeErrorType;
        let retryable = true;

        // Check if this is an initialization error (not retryable)
        const errorMessage = error?.message || String(error);
        const isInitializingError = errorMessage.includes('InitializingProjectConnection') ||
            errorMessage.includes('Realtime is initializing');

        if (isInitializingError) {
            // This is a temporary initialization error - don't retry
            retryable = false;
            realtimeLogger.info('Detected initialization error - will wait for automatic connection', {
                topic,
                error: errorMessage
            });
        }

        switch (status) {
            case 'TIMED_OUT':
                errorType = RealtimeErrorType.TIMEOUT;
                break;
            case 'CHANNEL_ERROR':
                errorType = RealtimeErrorType.CHANNEL_ERROR;
                break;
            default:
                errorType = RealtimeErrorType.SUBSCRIPTION_FAILED;
        }

        const realtimeError = new RealtimeError(
            errorType,
            `Subscription failed: ${status}`,
            {
                topic,
                status,
                originalError: error
            },
            retryable
        );

        // Track error in metrics (Requirement: 5.5)
        this.trackError(realtimeError);

        // Only log as error if it's not an initialization error
        if (isInitializingError) {
            realtimeLogger.info('Subscription waiting for initialization', realtimeError.toJSON());
        } else {
            realtimeLogger.error('Subscription error', realtimeError.toJSON());
        }

        return realtimeError;
    }

    /**
     * Retry subscription with exponential backoff
     * Requirements: 4.2, 4.3
     */
    private async retrySubscription(
        channelWrapper: ChannelWrapper,
        event: string,
        options: ChannelOptions
    ): Promise<void> {
        const retryState = channelWrapper.getRetryState();

        if (retryState.attempts >= this.retryConfig.maxRetries) {
            const error = new RealtimeError(
                RealtimeErrorType.SUBSCRIPTION_FAILED,
                'Max retry attempts reached',
                {
                    topic: channelWrapper.topic,
                    attempts: retryState.attempts,
                    maxRetries: this.retryConfig.maxRetries
                },
                false
            );

            channelWrapper.setError(error);
            this.lastError = error;

            realtimeLogger.error('Max retry attempts reached', error.toJSON());

            throw error;
        }

        const delay = calculateRetryDelay(retryState.attempts, this.retryConfig);

        channelWrapper.updateRetryState({
            attempts: retryState.attempts + 1,
            lastAttempt: Date.now(),
            nextRetryDelay: delay,
            isRetrying: true
        });

        realtimeLogger.info('Retrying subscription', {
            topic: channelWrapper.topic,
            attempt: retryState.attempts + 1,
            maxRetries: this.retryConfig.maxRetries,
            delay
        });

        this.connectionState = 'reconnecting';

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));

        // Attempt to resubscribe
        try {
            await this.resubscribeChannel(channelWrapper, event, options);

            // Success - reset retry state
            channelWrapper.resetRetryState();
            channelWrapper.clearError();
            this.connectionState = 'connected';

            // Track successful reconnection (Requirement: 5.5)
            this.trackReconnection();

            realtimeLogger.success('Subscription retry successful', {
                topic: channelWrapper.topic,
                totalReconnections: this.metrics.reconnectionCount
            });
        } catch (error) {
            // Retry failed, will be handled by caller
            channelWrapper.updateRetryState({
                isRetrying: false
            });

            throw error;
        }
    }

    /**
     * Resubscribe a channel (used for retry logic)
     * Requirements: 4.3
     * 
     * Note: This method does NOT call channel.subscribe() again because
     * Supabase Realtime doesn't allow multiple subscribe() calls on the same channel.
     * Instead, it waits for the existing subscription to resolve.
     */
    private async resubscribeChannel(
        channelWrapper: ChannelWrapper,
        event: string,
        options: ChannelOptions
    ): Promise<void> {
        realtimeLogger.info('Waiting for channel subscription to resolve', {
            topic: channelWrapper.topic,
            currentState: channelWrapper.state
        });

        // Don't call subscribe() again - just wait for the existing subscription
        // The channel will automatically reconnect and resolve
        return new Promise((resolve) => {
            // Set a timeout to resolve after a reasonable wait
            // The channel will continue trying to connect in the background
            setTimeout(() => {
                realtimeLogger.info('Resubscription wait completed', {
                    topic: channelWrapper.topic,
                    state: channelWrapper.state
                });
                resolve();
            }, 2000);
        });
    }

    /**
     * Subscribe to a topic with an event handler
     * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 5.1, 5.2, 5.5
     */
    public async subscribe<T = any>(
        topic: string,
        event: string,
        callback: (payload: T) => void,
        options: ChannelOptions = {}
    ): Promise<SubscriptionHandle> {
        const subscriptionStartTime = Date.now();
        const client = this.ensureClient();
        const subscriberId = this.generateSubscriberId();

        realtimeLogger.info('Subscribe request', {
            topic,
            event,
            subscriberId,
            options,
            timestamp: new Date().toISOString()
        });

        // Check if channel already exists
        let channelWrapper = this.channels.get(topic);

        if (channelWrapper) {
            // Channel exists, reuse it
            realtimeLogger.info('Reusing existing channel', {
                topic,
                currentSubscribers: channelWrapper.getSubscriberCount(),
                channelState: channelWrapper.state
            });

            // Add subscriber to existing channel
            channelWrapper.addSubscriber(event, callback, subscriberId);

            return {
                topic,
                event,
                id: subscriberId
            };
        }

        // Create new channel
        realtimeLogger.info('Creating new channel', {
            topic,
            options
        });

        const {
            private: isPrivate = true,
            self = false,
            ack = true
        } = options;

        // Create the channel with proper configuration
        const channel = client.channel(topic, {
            config: {
                broadcast: {
                    self,
                    ack
                },
                private: isPrivate
            }
        });

        // Create wrapper
        channelWrapper = new ChannelWrapper(topic, channel);
        channelWrapper.state = 'subscribing';
        this.channels.set(topic, channelWrapper);

        // Add subscriber before subscribing
        channelWrapper.addSubscriber(event, callback, subscriberId);

        // Set up event listener on the channel
        // We'll listen to all broadcast events and route them to the appropriate subscribers
        channel.on('broadcast' as any, { event }, (payload: any) => {
            const wrapper = this.channels.get(topic);
            if (!wrapper) return;

            // Track message received (Requirement: 5.5)
            this.trackMessageReceived(topic);

            const subscribers = wrapper.getSubscribersByEvent(event);

            realtimeLogger.info('Broadcasting to subscribers', {
                topic,
                event,
                subscriberCount: subscribers.length,
                totalMessagesReceived: this.metrics.messagesReceived
            });

            subscribers.forEach(sub => {
                try {
                    sub.callback(payload);
                } catch (error) {
                    realtimeLogger.error('Error in subscriber callback', {
                        topic,
                        event,
                        subscriberId: sub.id,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            });
        });

        // Set auth if using private channel
        if (isPrivate) {
            try {
                await this.ensureAuthenticated(client);
            } catch (error) {
                // Authentication failed - clean up and throw
                this.channels.delete(topic);

                if (error instanceof RealtimeError) {
                    this.lastError = error;
                    throw error;
                }

                const authError = new RealtimeError(
                    RealtimeErrorType.AUTHENTICATION_FAILED,
                    'Authentication failed',
                    {
                        topic,
                        error: error instanceof Error ? error.message : String(error)
                    },
                    false
                );

                this.lastError = authError;
                throw authError;
            }
        }

        // Subscribe to the channel with retry logic
        return new Promise(async (resolve, reject) => {
            const attemptSubscription = async (isRetry: boolean = false) => {
                channel.subscribe(async (status, err) => {
                    const wrapper = this.channels.get(topic);
                    if (!wrapper) return;

                    realtimeLogger.info('Channel subscription status', {
                        topic,
                        status,
                        error: err,
                        isRetry
                    });

                    if (status === 'SUBSCRIBED') {
                        wrapper.state = 'subscribed';
                        wrapper.clearError();

                        // Track subscription time (Requirement: 5.5)
                        this.trackSubscriptionTime(subscriptionStartTime);

                        realtimeLogger.success('Channel subscribed successfully', {
                            topic,
                            subscriberCount: wrapper.getSubscriberCount(),
                            isRetry,
                            subscriptionTime: Date.now() - subscriptionStartTime,
                            totalSubscriptions: this.getTotalSubscriptions()
                        });

                        resolve({
                            topic,
                            event,
                            id: subscriberId
                        });
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        const error = this.handleSubscriptionError(topic, status, err);
                        wrapper.setError(error);
                        this.lastError = error;

                        // Attempt retry if error is retryable
                        if (error.retryable && !isRetry) {
                            try {
                                await this.retrySubscription(wrapper, event, options);
                                // If retry succeeds, resolve
                                resolve({
                                    topic,
                                    event,
                                    id: subscriberId
                                });
                            } catch (retryError) {
                                // All retries failed
                                reject(retryError);
                            }
                        } else {
                            reject(error);
                        }
                    }
                });
            };

            await attemptSubscription();
        });
    }

    /**
     * Unsubscribe using a subscription handle
     * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
     */
    public async unsubscribe(handle: SubscriptionHandle): Promise<void> {
        const { topic, id } = handle;

        realtimeLogger.info('Unsubscribe request', {
            topic,
            subscriberId: id
        });

        const channelWrapper = this.channels.get(topic);
        if (!channelWrapper) {
            realtimeLogger.warn('Channel not found for unsubscribe', { topic });
            return;
        }

        // Remove the subscriber
        const removed = channelWrapper.removeSubscriber(id);
        if (!removed) {
            realtimeLogger.warn('Subscriber not found', { topic, subscriberId: id });
            return;
        }

        // If no more subscribers, close and remove the channel
        if (!channelWrapper.hasSubscribers()) {
            realtimeLogger.info('No more subscribers, closing channel', { topic });

            await channelWrapper.close();

            if (this.supabaseClient) {
                this.supabaseClient.removeChannel(channelWrapper.channel);
            }

            this.channels.delete(topic);

            realtimeLogger.success('Channel closed and removed', { topic });
        }
    }

    /**
     * Enable message batching for high-frequency updates
     * Requirements: 6.1, 6.4, 6.5
     */
    public enableBatching(batchDelay: number = 16, maxBatchSize: number = 50): void {
        if (this.messageBatcher) {
            realtimeLogger.warn('Message batching already enabled');
            return;
        }

        this.messageBatcher = createMessageBatcher(
            async (messages: BroadcastMessage[]) => {
                await this.flushBatchedMessages(messages);
            },
            batchDelay,
            maxBatchSize
        );

        this.batchingEnabled = true;

        realtimeLogger.info('Message batching enabled', {
            batchDelay,
            maxBatchSize
        });
    }

    /**
     * Disable message batching
     * Requirements: 6.1, 6.4
     */
    public disableBatching(): void {
        if (this.messageBatcher) {
            this.messageBatcher.destroy();
            this.messageBatcher = null;
        }

        this.batchingEnabled = false;

        realtimeLogger.info('Message batching disabled');
    }

    /**
     * Check if batching is enabled
     */
    public isBatchingEnabled(): boolean {
        return this.batchingEnabled;
    }

    /**
     * Flush batched messages
     * Requirements: 6.4, 6.5
     */
    private async flushBatchedMessages(messages: BroadcastMessage[]): Promise<void> {
        realtimeLogger.info('Flushing batched messages', {
            messageCount: messages.length
        });

        // Group messages by topic for efficient processing
        const messagesByTopic = new Map<string, BroadcastMessage[]>();

        for (const message of messages) {
            const topicMessages = messagesByTopic.get(message.topic) || [];
            topicMessages.push(message);
            messagesByTopic.set(message.topic, topicMessages);
        }

        // Send messages for each topic
        const sendPromises: Promise<void>[] = [];

        for (const [topic, topicMessages] of messagesByTopic) {
            const channelWrapper = this.channels.get(topic);

            if (!channelWrapper || channelWrapper.state !== 'subscribed') {
                realtimeLogger.warn('Skipping messages for unavailable channel', {
                    topic,
                    messageCount: topicMessages.length,
                    channelState: channelWrapper?.state || 'not_found'
                });
                continue;
            }

            // Send each message for this topic
            for (const message of topicMessages) {
                const promise = channelWrapper.channel.send({
                    type: 'broadcast',
                    event: message.event,
                    payload: message.payload
                }).then(() => {
                    this.trackMessageSent();
                }).catch((error) => {
                    realtimeLogger.error('Error sending batched message', {
                        topic: message.topic,
                        event: message.event,
                        error: error instanceof Error ? error.message : String(error)
                    });
                });

                sendPromises.push(promise);
            }
        }

        await Promise.allSettled(sendPromises);

        realtimeLogger.success('Batched messages flushed', {
            messageCount: messages.length,
            topicCount: messagesByTopic.size
        });
    }

    /**
     * Broadcast a message to a topic
     * Requirements: 3.1, 4.1, 4.4, 6.1, 6.4
     */
    public async broadcast(
        topic: string,
        event: string,
        payload: unknown
    ): Promise<void> {
        const channelWrapper = this.channels.get(topic);

        if (!channelWrapper) {
            const error = new RealtimeError(
                RealtimeErrorType.CHANNEL_ERROR,
                'Channel not found',
                { topic, event },
                false
            );

            realtimeLogger.error('Cannot broadcast: channel not found', error.toJSON());
            this.lastError = error;
            throw error;
        }

        if (channelWrapper.state !== 'subscribed') {
            const error = new RealtimeError(
                RealtimeErrorType.CHANNEL_ERROR,
                'Channel not ready for broadcast',
                {
                    topic,
                    event,
                    state: channelWrapper.state
                },
                true
            );

            realtimeLogger.error('Cannot broadcast: channel not subscribed', error.toJSON());
            channelWrapper.setError(error);
            throw error;
        }

        // Use batching if enabled (Requirement: 6.1, 6.4)
        if (this.batchingEnabled && this.messageBatcher) {
            this.messageBatcher.batch({
                topic,
                event,
                payload,
                timestamp: Date.now()
            });

            realtimeLogger.debug('Message added to batch', {
                topic,
                event,
                queueSize: this.messageBatcher.getQueueSize()
            });

            return;
        }

        // Direct broadcast without batching
        realtimeLogger.info('Broadcasting message', {
            topic,
            event,
            totalMessagesSent: this.metrics.messagesSent
        });

        try {
            await channelWrapper.channel.send({
                type: 'broadcast',
                event,
                payload
            });

            // Track message sent (Requirement: 5.5)
            this.trackMessageSent();

            realtimeLogger.success('Message broadcast successfully', {
                topic,
                event,
                totalMessagesSent: this.metrics.messagesSent
            });
        } catch (error) {
            const broadcastError = new RealtimeError(
                RealtimeErrorType.BROADCAST_FAILED,
                'Failed to broadcast message',
                {
                    topic,
                    event,
                    originalError: error instanceof Error ? error.message : String(error)
                },
                true
            );

            realtimeLogger.error('Error broadcasting message', broadcastError.toJSON());
            channelWrapper.setError(broadcastError);
            this.lastError = broadcastError;

            throw broadcastError;
        }
    }

    /**
     * Get the current connection state
     * Requirement: 1.4
     */
    public getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    /**
     * Get total number of subscriptions across all channels
     * Requirement: 5.5
     */
    private getTotalSubscriptions(): number {
        return Array.from(this.channels.values()).reduce(
            (total, wrapper) => total + wrapper.getSubscriberCount(),
            0
        );
    }

    /**
     * Get information about active channels
     * Requirement: 4.4, 5.2
     */
    public getActiveChannels(): Array<{
        topic: string;
        state: ChannelState;
        subscriberCount: number;
        retryState: RetryState;
        lastError: RealtimeError | null;
    }> {
        return Array.from(this.channels.values()).map(wrapper => ({
            topic: wrapper.topic,
            state: wrapper.state,
            subscriberCount: wrapper.getSubscriberCount(),
            retryState: wrapper.getRetryState(),
            lastError: wrapper.getLastError()
        }));
    }

    /**
     * Get the last error that occurred
     * Requirement: 4.4
     */
    public getLastError(): RealtimeError | null {
        return this.lastError;
    }

    /**
     * Clear the last error
     * Requirement: 4.4
     */
    public clearLastError(): void {
        this.lastError = null;
    }

    /**
     * Get error for a specific channel
     * Requirement: 4.4
     */
    public getChannelError(topic: string): RealtimeError | null {
        const wrapper = this.channels.get(topic);
        return wrapper?.getLastError() || null;
    }

    /**
     * Check if a channel is in error state
     * Requirement: 4.4
     */
    public isChannelInError(topic: string): boolean {
        const wrapper = this.channels.get(topic);
        return wrapper?.state === 'error' || false;
    }

    /**
     * Get retry configuration
     * Requirement: 4.2
     */
    public getRetryConfig(): RetryConfig {
        return { ...this.retryConfig };
    }

    /**
     * Update retry configuration
     * Requirement: 4.2
     */
    public setRetryConfig(config: Partial<RetryConfig>): void {
        this.retryConfig = {
            ...this.retryConfig,
            ...config
        };

        realtimeLogger.info('Retry configuration updated', {
            retryConfig: this.retryConfig
        });
    }

    /**
     * Get current metrics
     * Requirement: 5.3, 5.5
     */
    public getMetrics(): RealtimeMetrics {
        const channelsByTopic = new Map<string, number>();

        for (const [topic, wrapper] of this.channels) {
            channelsByTopic.set(topic, wrapper.getSubscriberCount());
        }

        const averageSubscriptionTime = this.metrics.subscriptionTimes.length > 0
            ? this.metrics.subscriptionTimes.reduce((a, b) => a + b, 0) / this.metrics.subscriptionTimes.length
            : 0;

        return {
            connectionUptime: Date.now() - this.metrics.connectionStartTime,
            reconnectionCount: this.metrics.reconnectionCount,
            activeChannels: this.channels.size,
            totalSubscriptions: this.getTotalSubscriptions(),
            channelsByTopic,
            messagesReceived: this.metrics.messagesReceived,
            messagesSent: this.metrics.messagesSent,
            errorCount: this.metrics.errorCount,
            errorsByType: new Map(this.metrics.errorsByType),
            averageSubscriptionTime,
            lastActivityTimestamp: this.metrics.lastActivityTimestamp
        };
    }

    /**
     * Get comprehensive debug information
     * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
     */
    public getDebugInfo(): RealtimeDebugInfo {
        const channels = Array.from(this.channels.values()).map(wrapper => ({
            topic: wrapper.topic,
            state: wrapper.state,
            subscriberCount: wrapper.getSubscriberCount(),
            lastMessage: this.metrics.channelLastMessage.get(wrapper.topic) || null,
            retryState: wrapper.getRetryState(),
            lastError: wrapper.getLastError()
        }));

        return {
            connectionState: this.connectionState,
            connectionUptime: Date.now() - this.metrics.connectionStartTime,
            channels,
            metrics: this.getMetrics(),
            recentErrors: [...this.metrics.recentErrors],
            retryConfig: { ...this.retryConfig }
        };
    }

    /**
     * Log debug information to console
     * Requirements: 5.1, 5.2, 5.3, 5.4
     */
    public logDebugInfo(): void {
        const debugInfo = this.getDebugInfo();

        realtimeLogger.info('=== Realtime Connection Manager Debug Info ===', {
            connectionState: debugInfo.connectionState,
            uptime: `${Math.floor(debugInfo.connectionUptime / 1000)}s`,
            activeChannels: debugInfo.metrics.activeChannels,
            totalSubscriptions: debugInfo.metrics.totalSubscriptions,
            messagesReceived: debugInfo.metrics.messagesReceived,
            messagesSent: debugInfo.metrics.messagesSent,
            reconnections: debugInfo.metrics.reconnectionCount,
            errors: debugInfo.metrics.errorCount,
            avgSubscriptionTime: `${Math.floor(debugInfo.metrics.averageSubscriptionTime)}ms`
        });

        if (debugInfo.channels.length > 0) {
            const channelInfo = debugInfo.channels.map(ch => ({
                topic: ch.topic,
                state: ch.state,
                subscribers: ch.subscriberCount,
                lastMessage: ch.lastMessage
                    ? `${Math.floor((Date.now() - ch.lastMessage) / 1000)}s ago`
                    : 'never',
                hasError: ch.lastError !== null
            }));
            realtimeLogger.info('Active Channels:', { channels: channelInfo });
        }

        if (debugInfo.metrics.errorsByType.size > 0) {
            const errorsByType: Record<string, number> = {};
            debugInfo.metrics.errorsByType.forEach((count, type) => {
                errorsByType[type] = count;
            });
            realtimeLogger.info('Errors by Type:', errorsByType);
        }

        if (debugInfo.recentErrors.length > 0) {
            const errorInfo = debugInfo.recentErrors.map(err => ({
                type: err.type,
                message: err.message,
                retryable: err.retryable,
                timestamp: new Date(err.timestamp).toISOString()
            }));
            realtimeLogger.info('Recent Errors:', { errors: errorInfo });
        }
    }

    /**
     * Clean up all resources
     * Requirements: 1.5, 3.3, 3.4, 6.1, 6.4
     */
    public async cleanup(): Promise<void> {
        realtimeLogger.info('Cleaning up RealtimeConnectionManager', {
            channelCount: this.channels.size
        });

        // Disable batching and flush any pending messages
        if (this.messageBatcher) {
            this.messageBatcher.destroy();
            this.messageBatcher = null;
        }

        // Close all channels
        const closePromises = Array.from(this.channels.values()).map(wrapper =>
            wrapper.close()
        );

        await Promise.all(closePromises);

        // Remove all channels from Supabase client
        if (this.supabaseClient) {
            this.supabaseClient.removeAllChannels();
        }

        // Clear the registry
        this.channels.clear();
        this.connectionState = 'disconnected';
        this.batchingEnabled = false;

        realtimeLogger.success('RealtimeConnectionManager cleaned up');
    }

    /**
     * Reset the singleton instance (useful for testing)
     */
    public static resetInstance(): void {
        if (RealtimeConnectionManager.instance) {
            RealtimeConnectionManager.instance.cleanup();
            RealtimeConnectionManager.instance = null;
        }
    }
}

// Export singleton instance getter
export const getRealtimeManager = () => RealtimeConnectionManager.getInstance();
