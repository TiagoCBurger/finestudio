/**
 * CrossTabSync - Multi-window synchronization using BroadcastChannel API
 * 
 * Handles synchronization of canvas updates across multiple browser tabs/windows
 * using the BroadcastChannel API for same-origin communication.
 */

export type CrossTabMessageType =
    | 'PROJECT_UPDATE'
    | 'CANVAS_CHANGE'
    | 'NODE_UPDATE'
    | 'EDGE_UPDATE'
    | 'SYNC_REQUEST'
    | 'SYNC_RESPONSE';

export interface CrossTabMessage<T = unknown> {
    type: CrossTabMessageType;
    payload: T;
    timestamp: number;
    tabId: string;
}

export interface ProjectUpdatePayload {
    projectId: string;
    updatedAt: string;
    data?: unknown;
}

export interface CanvasChangePayload {
    projectId: string;
    nodes?: unknown[];
    edges?: unknown[];
    updatedAt: string;
}

export interface ConflictResolver<T> {
    resolve(local: T, remote: T): T;
}

/**
 * Last-write-wins conflict resolution strategy
 * Compares timestamps and returns the most recent version
 */
export class LastWriteWinsResolver<T extends { updatedAt: string }>
    implements ConflictResolver<T> {
    resolve(local: T, remote: T): T {
        const localTime = new Date(local.updatedAt).getTime();
        const remoteTime = new Date(remote.updatedAt).getTime();

        return remoteTime > localTime ? remote : local;
    }
}

export type CrossTabEventHandler<T = unknown> = (
    message: CrossTabMessage<T>
) => void;

/**
 * CrossTabSync manages synchronization between multiple browser tabs/windows
 * using the BroadcastChannel API
 */
export class CrossTabSync {
    private bc: BroadcastChannel | null = null;
    private channelName: string;
    private tabId: string;
    private handlers: Map<CrossTabMessageType, Set<CrossTabEventHandler>>;
    private isSupported: boolean;

    constructor(channelName: string = 'tersa-sync') {
        this.channelName = channelName;
        this.tabId = this.generateTabId();
        this.handlers = new Map();
        this.isSupported = typeof BroadcastChannel !== 'undefined';

        if (this.isSupported) {
            this.initialize();
        } else {
            console.warn('BroadcastChannel API is not supported in this browser');
        }
    }

    /**
     * Initialize the BroadcastChannel and set up listeners
     */
    private initialize(): void {
        try {
            this.bc = new BroadcastChannel(this.channelName);
            this.setupListeners();
        } catch (error) {
            console.error('Failed to initialize BroadcastChannel:', error);
            this.isSupported = false;
        }
    }

    /**
     * Generate a unique tab ID for this instance
     */
    private generateTabId(): string {
        return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Set up message listeners for the BroadcastChannel
     */
    private setupListeners(): void {
        if (!this.bc) return;

        this.bc.onmessage = (event: MessageEvent<CrossTabMessage>) => {
            const message = event.data;

            // Ignore messages from this tab
            if (message.tabId === this.tabId) {
                return;
            }

            // Call registered handlers for this message type
            const handlers = this.handlers.get(message.type);
            if (handlers) {
                handlers.forEach((handler) => {
                    try {
                        handler(message);
                    } catch (error) {
                        console.error(
                            `Error in CrossTabSync handler for ${message.type}:`,
                            error
                        );
                    }
                });
            }
        };

        // Note: BroadcastChannel doesn't have an onerror handler in the standard API
        // Errors are typically handled in the onmessage handler or through try-catch
    }

    /**
     * Register a handler for a specific message type
     */
    on<T = unknown>(
        type: CrossTabMessageType,
        handler: CrossTabEventHandler<T>
    ): () => void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }

        const handlers = this.handlers.get(type)!;
        handlers.add(handler as CrossTabEventHandler);

        // Return unsubscribe function
        return () => {
            handlers.delete(handler as CrossTabEventHandler);
            if (handlers.size === 0) {
                this.handlers.delete(type);
            }
        };
    }

    /**
     * Broadcast a message to all other tabs
     */
    broadcast<T = unknown>(type: CrossTabMessageType, payload: T): void {
        if (!this.isSupported || !this.bc) {
            return;
        }

        const message: CrossTabMessage<T> = {
            type,
            payload,
            timestamp: Date.now(),
            tabId: this.tabId,
        };

        try {
            this.bc.postMessage(message);
        } catch (error) {
            console.error('Failed to broadcast message:', error);
        }
    }

    /**
     * Broadcast a project update
     */
    broadcastProjectUpdate(payload: ProjectUpdatePayload): void {
        this.broadcast('PROJECT_UPDATE', payload);
    }

    /**
     * Broadcast a canvas change
     */
    broadcastCanvasChange(payload: CanvasChangePayload): void {
        this.broadcast('CANVAS_CHANGE', payload);
    }

    /**
     * Request sync from other tabs
     */
    requestSync(projectId: string): void {
        this.broadcast('SYNC_REQUEST', { projectId });
    }

    /**
     * Respond to a sync request
     */
    respondToSync<T = unknown>(projectId: string, data: T): void {
        this.broadcast('SYNC_RESPONSE', { projectId, data });
    }

    /**
     * Check if BroadcastChannel is supported
     */
    get supported(): boolean {
        return this.isSupported;
    }

    /**
     * Get the current tab ID
     */
    get currentTabId(): string {
        return this.tabId;
    }

    /**
     * Close the BroadcastChannel and clean up resources
     */
    close(): void {
        if (this.bc) {
            this.bc.close();
            this.bc = null;
        }
        this.handlers.clear();
    }

    /**
     * Get debug information
     */
    getDebugInfo(): {
        channelName: string;
        tabId: string;
        isSupported: boolean;
        handlerCount: number;
    } {
        return {
            channelName: this.channelName,
            tabId: this.tabId,
            isSupported: this.isSupported,
            handlerCount: Array.from(this.handlers.values()).reduce(
                (sum, handlers) => sum + handlers.size,
                0
            ),
        };
    }
}

// Singleton instance for the application
let crossTabSyncInstance: CrossTabSync | null = null;

/**
 * Get or create the singleton CrossTabSync instance
 */
export function getCrossTabSync(
    channelName: string = 'tersa-sync'
): CrossTabSync {
    if (!crossTabSyncInstance) {
        crossTabSyncInstance = new CrossTabSync(channelName);
    }
    return crossTabSyncInstance;
}

/**
 * Clean up the singleton instance
 */
export function cleanupCrossTabSync(): void {
    if (crossTabSyncInstance) {
        crossTabSyncInstance.close();
        crossTabSyncInstance = null;
    }
}
