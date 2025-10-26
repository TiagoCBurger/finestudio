/**
 * React hook for multi-window synchronization using CrossTabSync
 */

import { useEffect, useRef, useCallback } from 'react';
import {
    getCrossTabSync,
    CrossTabSync,
    CrossTabMessageType,
    CrossTabEventHandler,
    ProjectUpdatePayload,
    CanvasChangePayload,
} from '@/lib/cross-tab-sync';

export interface UseCrossTabSyncOptions {
    enabled?: boolean;
    channelName?: string;
    onProjectUpdate?: (payload: ProjectUpdatePayload) => void;
    onCanvasChange?: (payload: CanvasChangePayload) => void;
}

export interface UseCrossTabSyncReturn {
    isSupported: boolean;
    tabId: string;
    broadcastProjectUpdate: (payload: ProjectUpdatePayload) => void;
    broadcastCanvasChange: (payload: CanvasChangePayload) => void;
    broadcast: <T = unknown>(type: CrossTabMessageType, payload: T) => void;
    requestSync: (projectId: string) => void;
}

/**
 * Hook for multi-window synchronization
 * 
 * @example
 * ```tsx
 * const { broadcastCanvasChange, isSupported } = useCrossTabSync({
 *   enabled: true,
 *   onCanvasChange: (payload) => {
 *     // Update local canvas state
 *     updateCanvas(payload);
 *   }
 * });
 * 
 * // Broadcast changes to other tabs
 * broadcastCanvasChange({
 *   projectId: '123',
 *   nodes: updatedNodes,
 *   edges: updatedEdges,
 *   updatedAt: new Date().toISOString()
 * });
 * ```
 */
export function useCrossTabSync(
    options: UseCrossTabSyncOptions = {}
): UseCrossTabSyncReturn {
    const {
        enabled = true,
        channelName = 'tersa-sync',
        onProjectUpdate,
        onCanvasChange,
    } = options;

    const syncRef = useRef<CrossTabSync | null>(null);
    const unsubscribersRef = useRef<Array<() => void>>([]);

    // Initialize CrossTabSync
    useEffect(() => {
        if (!enabled) return;

        syncRef.current = getCrossTabSync(channelName);

        return () => {
            // Cleanup handlers but don't close the singleton
            unsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
            unsubscribersRef.current = [];
        };
    }, [enabled, channelName]);

    // Register PROJECT_UPDATE handler
    useEffect(() => {
        if (!enabled || !syncRef.current || !onProjectUpdate) return;

        const unsubscribe = syncRef.current.on<ProjectUpdatePayload>(
            'PROJECT_UPDATE',
            (message) => {
                onProjectUpdate(message.payload);
            }
        );

        unsubscribersRef.current.push(unsubscribe);

        return () => {
            unsubscribe();
        };
    }, [enabled, onProjectUpdate]);

    // Register CANVAS_CHANGE handler
    useEffect(() => {
        if (!enabled || !syncRef.current || !onCanvasChange) return;

        const unsubscribe = syncRef.current.on<CanvasChangePayload>(
            'CANVAS_CHANGE',
            (message) => {
                onCanvasChange(message.payload);
            }
        );

        unsubscribersRef.current.push(unsubscribe);

        return () => {
            unsubscribe();
        };
    }, [enabled, onCanvasChange]);

    // Broadcast project update
    const broadcastProjectUpdate = useCallback(
        (payload: ProjectUpdatePayload) => {
            if (!enabled || !syncRef.current) return;
            syncRef.current.broadcastProjectUpdate(payload);
        },
        [enabled]
    );

    // Broadcast canvas change
    const broadcastCanvasChange = useCallback(
        (payload: CanvasChangePayload) => {
            if (!enabled || !syncRef.current) return;
            syncRef.current.broadcastCanvasChange(payload);
        },
        [enabled]
    );

    // Generic broadcast
    const broadcast = useCallback(
        <T = unknown>(type: CrossTabMessageType, payload: T) => {
            if (!enabled || !syncRef.current) return;
            syncRef.current.broadcast(type, payload);
        },
        [enabled]
    );

    // Request sync
    const requestSync = useCallback(
        (projectId: string) => {
            if (!enabled || !syncRef.current) return;
            syncRef.current.requestSync(projectId);
        },
        [enabled]
    );

    return {
        isSupported: syncRef.current?.supported ?? false,
        tabId: syncRef.current?.currentTabId ?? '',
        broadcastProjectUpdate,
        broadcastCanvasChange,
        broadcast,
        requestSync,
    };
}

/**
 * Hook for handling canvas synchronization with conflict resolution
 */
export interface UseCanvasSyncOptions {
    projectId: string;
    enabled?: boolean;
    onRemoteUpdate: (payload: CanvasChangePayload) => void;
    getCurrentState: () => {
        nodes: unknown[];
        edges: unknown[];
        updatedAt: string;
    };
}

export function useCanvasSync(options: UseCanvasSyncOptions) {
    const { projectId, enabled = true, onRemoteUpdate, getCurrentState } = options;

    const lastBroadcastRef = useRef<number>(0);
    const BROADCAST_THROTTLE = 100; // ms

    const handleCanvasChange = useCallback(
        (payload: CanvasChangePayload) => {
            // Only process updates for this project
            if (payload.projectId !== projectId) return;

            // Apply conflict resolution (last-write-wins)
            const currentState = getCurrentState();
            const localTime = new Date(currentState.updatedAt).getTime();
            const remoteTime = new Date(payload.updatedAt).getTime();

            // Only apply if remote is newer
            if (remoteTime > localTime) {
                onRemoteUpdate(payload);
            }
        },
        [projectId, getCurrentState, onRemoteUpdate]
    );

    const { broadcastCanvasChange, isSupported } = useCrossTabSync({
        enabled,
        onCanvasChange: handleCanvasChange,
    });

    // Throttled broadcast function
    const broadcastUpdate = useCallback(
        (nodes: unknown[], edges: unknown[]) => {
            const now = Date.now();
            if (now - lastBroadcastRef.current < BROADCAST_THROTTLE) {
                return;
            }

            lastBroadcastRef.current = now;
            broadcastCanvasChange({
                projectId,
                nodes,
                edges,
                updatedAt: new Date().toISOString(),
            });
        },
        [projectId, broadcastCanvasChange]
    );

    return {
        isSupported,
        broadcastUpdate,
    };
}
