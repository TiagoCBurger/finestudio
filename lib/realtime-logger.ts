/**
 * Structured logging utility for Supabase Realtime
 * Provides consistent logging format with environment-based log levels
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

/**
 * Log entry structure for structured logging
 */
interface LogEntry {
    level: LogLevel;
    message: string;
    context?: LogContext;
    timestamp: string;
}

class RealtimeLogger {
    private isDevelopment: boolean;
    private prefix = '🔴 [REALTIME]';
    private logHistory: LogEntry[] = [];
    private maxHistorySize = 100;

    constructor() {
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }

    /**
     * Add entry to log history
     * Requirement: 5.3
     */
    private addToHistory(entry: LogEntry): void {
        this.logHistory.push(entry);

        // Keep only last N entries
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift();
        }
    }

    /**
     * Get log history
     * Requirement: 5.3
     */
    getHistory(): LogEntry[] {
        return [...this.logHistory];
    }

    /**
     * Clear log history
     * Requirement: 5.3
     */
    clearHistory(): void {
        this.logHistory = [];
    }

    /**
     * Log debug messages (only in development)
     * Requirement: 5.4
     */
    debug(message: string, context?: LogContext) {
        const entry: LogEntry = {
            level: 'debug',
            message,
            context,
            timestamp: new Date().toISOString()
        };

        this.addToHistory(entry);

        if (this.isDevelopment) {
            if (context) {
                console.log(`${this.prefix} 🔍 [DEBUG] ${message}`, context);
            } else {
                console.log(`${this.prefix} 🔍 [DEBUG] ${message}`);
            }
        }
    }

    /**
     * Log info messages (only in development)
     * Requirement: 5.4
     */
    info(message: string, context?: LogContext) {
        const entry: LogEntry = {
            level: 'info',
            message,
            context,
            timestamp: new Date().toISOString()
        };

        this.addToHistory(entry);

        if (this.isDevelopment) {
            if (context) {
                console.log(`${this.prefix} ${message}`, context);
            } else {
                console.log(`${this.prefix} ${message}`);
            }
        }
    }

    /**
     * Log warning messages (always shown)
     * Requirement: 5.4
     */
    warn(message: string, context?: LogContext) {
        const entry: LogEntry = {
            level: 'warn',
            message,
            context,
            timestamp: new Date().toISOString()
        };

        this.addToHistory(entry);

        if (context) {
            console.warn(`${this.prefix} ⚠️ ${message}`, context);
        } else {
            console.warn(`${this.prefix} ⚠️ ${message}`);
        }
    }

    /**
     * Log error messages (always shown)
     * Requirement: 5.4
     */
    error(message: string, context?: LogContext) {
        const entry: LogEntry = {
            level: 'error',
            message,
            context,
            timestamp: new Date().toISOString()
        };

        this.addToHistory(entry);

        if (context) {
            console.error(`${this.prefix} ❌ ${message}`, context);
        } else {
            console.error(`${this.prefix} ❌ ${message}`);
        }
    }

    /**
     * Log success messages (only in development)
     * Requirement: 5.4
     */
    success(message: string, context?: LogContext) {
        const entry: LogEntry = {
            level: 'info',
            message: `✅ ${message}`,
            context,
            timestamp: new Date().toISOString()
        };

        this.addToHistory(entry);

        if (this.isDevelopment) {
            if (context) {
                console.log(`${this.prefix} ✅ ${message}`, context);
            } else {
                console.log(`${this.prefix} ✅ ${message}`);
            }
        }
    }

    /**
     * Get the appropriate Supabase log level based on environment
     */
    getSupabaseLogLevel(): 'info' | 'error' {
        return this.isDevelopment ? 'info' : 'error';
    }

    /**
     * Create a timestamped context object
     */
    createContext(data: LogContext = {}): LogContext {
        return {
            ...data,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Log detailed connection state for debugging
     * Requirement: 5.1, 5.4
     */
    debugConnectionState(channelName: string, state: {
        channelState?: string;
        isSubscribing?: boolean;
        isSubscribed?: boolean;
        retryCount?: number;
        hasSession?: boolean;
        sessionExpiry?: string;
    }) {
        this.debug(`Connection State for ${channelName}`, {
            ...state,
            channelName
        });
    }

    /**
     * Log WebSocket connection details
     * Requirement: 5.1, 5.4
     */
    debugWebSocket(details: {
        readyState?: number;
        url?: string;
        protocol?: string;
        extensions?: string;
    }) {
        const readyStateMap: Record<number, string> = {
            0: 'CONNECTING',
            1: 'OPEN',
            2: 'CLOSING',
            3: 'CLOSED'
        };

        this.debug('WebSocket State', {
            ...details,
            readyStateText: details.readyState !== undefined ? readyStateMap[details.readyState] : 'unknown'
        });
    }

    /**
     * Log channel creation event
     * Requirement: 5.2
     */
    logChannelCreated(topic: string, options: Record<string, unknown>) {
        this.info('Channel created', {
            topic,
            options,
            event: 'channel_created'
        });
    }

    /**
     * Log channel reuse event
     * Requirement: 5.2
     */
    logChannelReused(topic: string, subscriberCount: number) {
        this.info('Channel reused', {
            topic,
            subscriberCount,
            event: 'channel_reused'
        });
    }

    /**
     * Log subscription event
     * Requirement: 5.2, 5.5
     */
    logSubscription(topic: string, event: string, subscriberId: string, metrics?: {
        totalSubscriptions?: number;
        subscriptionTime?: number;
    }) {
        this.info('Subscription created', {
            topic,
            event,
            subscriberId,
            ...metrics,
            event_type: 'subscription_created'
        });
    }

    /**
     * Log unsubscription event
     * Requirement: 5.2, 5.5
     */
    logUnsubscription(topic: string, subscriberId: string, remainingSubscribers: number) {
        this.info('Subscription removed', {
            topic,
            subscriberId,
            remainingSubscribers,
            event_type: 'subscription_removed'
        });
    }

    /**
     * Log message received event
     * Requirement: 5.2, 5.5
     */
    logMessageReceived(topic: string, event: string, metrics?: {
        totalMessagesReceived?: number;
        subscriberCount?: number;
    }) {
        this.debug('Message received', {
            topic,
            event,
            ...metrics,
            event_type: 'message_received'
        });
    }

    /**
     * Log message sent event
     * Requirement: 5.2, 5.5
     */
    logMessageSent(topic: string, event: string, metrics?: {
        totalMessagesSent?: number;
    }) {
        this.debug('Message sent', {
            topic,
            event,
            ...metrics,
            event_type: 'message_sent'
        });
    }

    /**
     * Log reconnection event
     * Requirement: 5.1, 5.5
     */
    logReconnection(topic: string, attempt: number, delay: number) {
        this.warn('Reconnection attempt', {
            topic,
            attempt,
            delay,
            event_type: 'reconnection_attempt'
        });
    }

    /**
     * Log metrics summary
     * Requirement: 5.3, 5.5
     */
    logMetrics(metrics: {
        activeChannels: number;
        totalSubscriptions: number;
        messagesReceived: number;
        messagesSent: number;
        errorCount: number;
        reconnectionCount: number;
        uptime: number;
    }) {
        this.info('Metrics Summary', {
            ...metrics,
            uptimeFormatted: `${Math.floor(metrics.uptime / 1000)}s`,
            event_type: 'metrics_summary'
        });
    }
}

// Export singleton instance
export const realtimeLogger = new RealtimeLogger();