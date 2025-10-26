/**
 * React hook for debounced realtime updates
 * 
 * This hook provides a debounced callback for handling high-frequency
 * realtime updates, preventing excessive re-renders.
 * 
 * Requirements: 6.2
 */

import { useCallback, useEffect, useRef } from 'react';
import { DebouncedUpdate, createDebouncedUpdate } from '@/lib/realtime-performance';

/**
 * Hook for creating a debounced realtime update handler
 * 
 * @param callback - Function to call with the latest payload
 * @param delay - Delay in ms before calling the callback (default: 100ms)
 * @returns Debounced update function
 * 
 * @example
 * ```tsx
 * const handleUpdate = useDebouncedRealtimeUpdate((data) => {
 *   setCanvasData(data);
 * }, 100);
 * 
 * useRealtimeSubscription({
 *   topic: 'project:123',
 *   event: 'canvas_update',
 *   onMessage: handleUpdate
 * });
 * ```
 */
export function useDebouncedRealtimeUpdate<T>(
    callback: (payload: T) => void,
    delay: number = 100
): (payload: T) => void {
    const debouncedRef = useRef<DebouncedUpdate<T> | null>(null);
    const callbackRef = useRef(callback);

    // Keep callback ref up to date
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Create debounced update on mount
    useEffect(() => {
        debouncedRef.current = createDebouncedUpdate(
            (payload: T) => callbackRef.current(payload),
            delay
        );

        return () => {
            if (debouncedRef.current) {
                debouncedRef.current.destroy();
                debouncedRef.current = null;
            }
        };
    }, [delay]);

    // Return the update function
    return useCallback((payload: T) => {
        if (debouncedRef.current) {
            debouncedRef.current.update(payload);
        }
    }, []);
}

/**
 * Hook for creating a debounced realtime update handler with flush control
 * 
 * @param callback - Function to call with the latest payload
 * @param delay - Delay in ms before calling the callback (default: 100ms)
 * @returns Object with update, flush, and cancel functions
 * 
 * @example
 * ```tsx
 * const { update, flush, cancel } = useDebouncedRealtimeUpdateWithControl((data) => {
 *   setCanvasData(data);
 * }, 100);
 * 
 * // Use in realtime subscription
 * useRealtimeSubscription({
 *   topic: 'project:123',
 *   event: 'canvas_update',
 *   onMessage: update
 * });
 * 
 * // Force immediate update
 * const handleSave = () => {
 *   flush();
 *   saveToServer();
 * };
 * ```
 */
export function useDebouncedRealtimeUpdateWithControl<T>(
    callback: (payload: T) => void,
    delay: number = 100
): {
    update: (payload: T) => void;
    flush: () => void;
    cancel: () => void;
    getStats: () => { callCount: number; lastCallTime: number; hasPending: boolean };
} {
    const debouncedRef = useRef<DebouncedUpdate<T> | null>(null);
    const callbackRef = useRef(callback);

    // Keep callback ref up to date
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Create debounced update on mount
    useEffect(() => {
        debouncedRef.current = createDebouncedUpdate(
            (payload: T) => callbackRef.current(payload),
            delay
        );

        return () => {
            if (debouncedRef.current) {
                debouncedRef.current.destroy();
                debouncedRef.current = null;
            }
        };
    }, [delay]);

    const update = useCallback((payload: T) => {
        if (debouncedRef.current) {
            debouncedRef.current.update(payload);
        }
    }, []);

    const flush = useCallback(() => {
        if (debouncedRef.current) {
            debouncedRef.current.flush();
        }
    }, []);

    const cancel = useCallback(() => {
        if (debouncedRef.current) {
            debouncedRef.current.cancel();
        }
    }, []);

    const getStats = useCallback(() => {
        if (debouncedRef.current) {
            return debouncedRef.current.getStats();
        }
        return {
            callCount: 0,
            lastCallTime: 0,
            hasPending: false
        };
    }, []);

    return {
        update,
        flush,
        cancel,
        getStats
    };
}
