/**
 * Performance optimization utilities for Realtime operations
 * 
 * This module provides:
 * - Message batching for high-frequency updates
 * - Debounced update helpers
 * - Optimistic update management
 * - 60fps update batching
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { realtimeLogger } from '@/lib/realtime-logger';

/**
 * Message to be batched
 * Requirement: 6.1, 6.4
 */
export interface BroadcastMessage {
    topic: string;
    event: string;
    payload: unknown;
    timestamp: number;
}

/**
 * Optimistic update entry
 * Requirement: 6.3
 */
export interface OptimisticUpdate<T = any> {
    id: string;
    data: T;
    timestamp: number;
    confirmed: boolean;
}

/**
 * Message batcher for high-frequency updates
 * Batches messages and flushes them at ~60fps for smooth performance
 * Requirements: 6.1, 6.4, 6.5
 */
export class MessageBatcher {
    private queue: BroadcastMessage[] = [];
    private flushTimer: NodeJS.Timeout | null = null;
    private readonly batchDelay: number;
    private readonly maxBatchSize: number;
    private onFlush: (messages: BroadcastMessage[]) => void | Promise<void>;
    private isProcessing: boolean = false;

    /**
     * Create a new message batcher
     * @param batchDelay - Delay in ms before flushing (default: 16ms for ~60fps)
     * @param maxBatchSize - Maximum number of messages to batch before forcing flush
     * @param onFlush - Callback to handle flushed messages
     */
    constructor(
        batchDelay: number = 16,
        maxBatchSize: number = 50,
        onFlush: (messages: BroadcastMessage[]) => void | Promise<void>
    ) {
        this.batchDelay = batchDelay;
        this.maxBatchSize = maxBatchSize;
        this.onFlush = onFlush;

        realtimeLogger.info('MessageBatcher initialized', {
            batchDelay,
            maxBatchSize
        });
    }

    /**
     * Add a message to the batch queue
     * Requirement: 6.1, 6.4
     */
    batch(message: BroadcastMessage): void {
        this.queue.push(message);

        realtimeLogger.debug('Message added to batch', {
            topic: message.topic,
            event: message.event,
            queueSize: this.queue.length
        });

        // Force flush if we've reached max batch size
        if (this.queue.length >= this.maxBatchSize) {
            realtimeLogger.info('Max batch size reached, forcing flush', {
                queueSize: this.queue.length,
                maxBatchSize: this.maxBatchSize
            });
            this.flush();
            return;
        }

        // Schedule flush if not already scheduled
        if (!this.flushTimer) {
            this.flushTimer = setTimeout(() => {
                this.flush();
            }, this.batchDelay);
        }
    }

    /**
     * Flush all queued messages
     * Requirement: 6.4, 6.5
     */
    flush(): void {
        if (this.isProcessing) {
            realtimeLogger.debug('Already processing, skipping flush');
            return;
        }

        if (this.queue.length === 0) {
            realtimeLogger.debug('Queue empty, nothing to flush');
            return;
        }

        // Clear the timer
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        // Get all queued messages
        const messages = [...this.queue];
        this.queue = [];
        this.isProcessing = true;

        realtimeLogger.info('Flushing message batch', {
            messageCount: messages.length
        });

        // Process the batch
        try {
            const result = this.onFlush(messages);

            // Handle async flush
            if (result instanceof Promise) {
                result
                    .then(() => {
                        this.isProcessing = false;
                        realtimeLogger.success('Batch flushed successfully', {
                            messageCount: messages.length
                        });
                    })
                    .catch((error) => {
                        this.isProcessing = false;
                        realtimeLogger.error('Error flushing batch', {
                            messageCount: messages.length,
                            error: error instanceof Error ? error.message : String(error)
                        });
                    });
            } else {
                this.isProcessing = false;
                realtimeLogger.success('Batch flushed successfully', {
                    messageCount: messages.length
                });
            }
        } catch (error) {
            this.isProcessing = false;
            realtimeLogger.error('Error flushing batch', {
                messageCount: messages.length,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Get the current queue size
     */
    getQueueSize(): number {
        return this.queue.length;
    }

    /**
     * Check if currently processing
     */
    isFlushInProgress(): boolean {
        return this.isProcessing;
    }

    /**
     * Clear the queue without flushing
     */
    clear(): void {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        const clearedCount = this.queue.length;
        this.queue = [];

        realtimeLogger.info('Message batch cleared', {
            clearedCount
        });
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.flush(); // Flush any remaining messages
        this.clear();

        realtimeLogger.info('MessageBatcher destroyed');
    }
}

/**
 * Debounced function wrapper
 * Requirement: 6.2
 */
export class DebouncedUpdate<T = any> {
    private timeoutRef: NodeJS.Timeout | null = null;
    private latestPayload: T | null = null;
    private readonly callback: (payload: T) => void;
    private readonly delay: number;
    private callCount: number = 0;
    private lastCallTime: number = 0;

    /**
     * Create a debounced update handler
     * @param callback - Function to call with the latest payload
     * @param delay - Delay in ms before calling the callback
     */
    constructor(callback: (payload: T) => void, delay: number = 100) {
        this.callback = callback;
        this.delay = delay;

        realtimeLogger.debug('DebouncedUpdate created', { delay });
    }

    /**
     * Update with a new payload
     * The callback will be called after the delay with the latest payload
     * Requirement: 6.2
     */
    update(payload: T): void {
        this.latestPayload = payload;
        this.callCount++;
        this.lastCallTime = Date.now();

        if (this.timeoutRef) {
            clearTimeout(this.timeoutRef);
        }

        this.timeoutRef = setTimeout(() => {
            if (this.latestPayload !== null) {
                realtimeLogger.debug('Debounced update executing', {
                    delay: this.delay,
                    callCount: this.callCount,
                    timeSinceLastCall: Date.now() - this.lastCallTime
                });

                try {
                    this.callback(this.latestPayload);
                    this.callCount = 0; // Reset after successful execution
                } catch (error) {
                    realtimeLogger.error('Error in debounced callback', {
                        error: error instanceof Error ? error.message : String(error)
                    });
                }

                this.latestPayload = null;
            }
            this.timeoutRef = null;
        }, this.delay);
    }

    /**
     * Force immediate execution of the callback with the latest payload
     */
    flush(): void {
        if (this.timeoutRef) {
            clearTimeout(this.timeoutRef);
            this.timeoutRef = null;
        }

        if (this.latestPayload !== null) {
            realtimeLogger.debug('Debounced update flushed', {
                callCount: this.callCount
            });

            try {
                this.callback(this.latestPayload);
                this.callCount = 0;
            } catch (error) {
                realtimeLogger.error('Error in debounced callback (flush)', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }

            this.latestPayload = null;
        }
    }

    /**
     * Cancel any pending callback
     */
    cancel(): void {
        if (this.timeoutRef) {
            clearTimeout(this.timeoutRef);
            this.timeoutRef = null;
        }

        this.latestPayload = null;
        this.callCount = 0;

        realtimeLogger.debug('Debounced update cancelled');
    }

    /**
     * Get statistics about this debounced update
     */
    getStats(): {
        callCount: number;
        lastCallTime: number;
        hasPending: boolean;
    } {
        return {
            callCount: this.callCount,
            lastCallTime: this.lastCallTime,
            hasPending: this.latestPayload !== null
        };
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.cancel();
        realtimeLogger.debug('DebouncedUpdate destroyed');
    }
}

/**
 * Manager for optimistic updates
 * Tracks local updates and reconciles them with server confirmations
 * Requirements: 6.3
 */
export class OptimisticUpdateManager<T = any> {
    private updates: Map<string, OptimisticUpdate<T>> = new Map();
    private readonly maxAge: number;
    private cleanupTimer: NodeJS.Timeout | null = null;

    /**
     * Create an optimistic update manager
     * @param maxAge - Maximum age in ms before auto-cleanup (default: 30s)
     */
    constructor(maxAge: number = 30000) {
        this.maxAge = maxAge;

        // Start periodic cleanup
        this.startCleanup();

        realtimeLogger.info('OptimisticUpdateManager initialized', {
            maxAge
        });
    }

    /**
     * Add an optimistic update
     * Requirement: 6.3
     */
    add(id: string, data: T): void {
        this.updates.set(id, {
            id,
            data,
            timestamp: Date.now(),
            confirmed: false
        });

        realtimeLogger.debug('Optimistic update added', {
            id,
            totalUpdates: this.updates.size
        });
    }

    /**
     * Confirm an optimistic update
     * Requirement: 6.3
     */
    confirm(id: string): boolean {
        const update = this.updates.get(id);

        if (!update) {
            realtimeLogger.warn('Cannot confirm: update not found', { id });
            return false;
        }

        update.confirmed = true;

        realtimeLogger.debug('Optimistic update confirmed', {
            id,
            age: Date.now() - update.timestamp
        });

        return true;
    }

    /**
     * Rollback an optimistic update
     * Returns the data that was rolled back
     * Requirement: 6.3
     */
    rollback(id: string): T | undefined {
        const update = this.updates.get(id);

        if (!update) {
            realtimeLogger.warn('Cannot rollback: update not found', { id });
            return undefined;
        }

        this.updates.delete(id);

        realtimeLogger.info('Optimistic update rolled back', {
            id,
            age: Date.now() - update.timestamp
        });

        return update.data;
    }

    /**
     * Get an optimistic update by ID
     */
    get(id: string): OptimisticUpdate<T> | undefined {
        return this.updates.get(id);
    }

    /**
     * Check if an update exists
     */
    has(id: string): boolean {
        return this.updates.has(id);
    }

    /**
     * Check if an update is confirmed
     */
    isConfirmed(id: string): boolean {
        const update = this.updates.get(id);
        return update?.confirmed || false;
    }

    /**
     * Get all pending (unconfirmed) updates
     */
    getPending(): OptimisticUpdate<T>[] {
        return Array.from(this.updates.values()).filter(
            update => !update.confirmed
        );
    }

    /**
     * Get all confirmed updates
     */
    getConfirmed(): OptimisticUpdate<T>[] {
        return Array.from(this.updates.values()).filter(
            update => update.confirmed
        );
    }

    /**
     * Get the number of updates
     */
    size(): number {
        return this.updates.size;
    }

    /**
     * Clean up old updates
     * Removes confirmed updates and updates older than maxAge
     * Requirement: 6.3
     */
    cleanup(): void {
        const now = Date.now();
        let removedCount = 0;

        for (const [id, update] of this.updates) {
            const age = now - update.timestamp;

            if (update.confirmed || age > this.maxAge) {
                this.updates.delete(id);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            realtimeLogger.info('Optimistic updates cleaned up', {
                removedCount,
                remainingUpdates: this.updates.size
            });
        }
    }

    /**
     * Start periodic cleanup
     */
    private startCleanup(): void {
        // Run cleanup every 10 seconds
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, 10000);
    }

    /**
     * Stop periodic cleanup
     */
    private stopCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Clear all updates
     */
    clear(): void {
        const clearedCount = this.updates.size;
        this.updates.clear();

        realtimeLogger.info('All optimistic updates cleared', {
            clearedCount
        });
    }

    /**
     * Get statistics about optimistic updates
     */
    getStats(): {
        total: number;
        pending: number;
        confirmed: number;
        oldestAge: number | null;
    } {
        const now = Date.now();
        const pending = this.getPending();
        const confirmed = this.getConfirmed();

        let oldestAge: number | null = null;

        for (const update of this.updates.values()) {
            const age = now - update.timestamp;
            if (oldestAge === null || age > oldestAge) {
                oldestAge = age;
            }
        }

        return {
            total: this.updates.size,
            pending: pending.length,
            confirmed: confirmed.length,
            oldestAge
        };
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.stopCleanup();
        this.clear();

        realtimeLogger.info('OptimisticUpdateManager destroyed');
    }
}

/**
 * Create a debounced update handler
 * Helper function for creating debounced updates
 * Requirement: 6.2
 */
export function createDebouncedUpdate<T>(
    callback: (payload: T) => void,
    delay: number = 100
): DebouncedUpdate<T> {
    return new DebouncedUpdate(callback, delay);
}

/**
 * Create a message batcher
 * Helper function for creating message batchers
 * Requirements: 6.1, 6.4
 */
export function createMessageBatcher(
    onFlush: (messages: BroadcastMessage[]) => void | Promise<void>,
    batchDelay: number = 16,
    maxBatchSize: number = 50
): MessageBatcher {
    return new MessageBatcher(batchDelay, maxBatchSize, onFlush);
}

/**
 * Create an optimistic update manager
 * Helper function for creating optimistic update managers
 * Requirement: 6.3
 */
export function createOptimisticUpdateManager<T = any>(
    maxAge: number = 30000
): OptimisticUpdateManager<T> {
    return new OptimisticUpdateManager<T>(maxAge);
}
