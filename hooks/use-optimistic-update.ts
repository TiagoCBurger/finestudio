/**
 * React hook for optimistic updates
 * 
 * This hook provides utilities for managing optimistic updates,
 * allowing immediate UI updates while waiting for server confirmation.
 * 
 * Requirements: 6.3
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    OptimisticUpdateManager,
    createOptimisticUpdateManager,
    type OptimisticUpdate
} from '@/lib/realtime-performance';

/**
 * Hook for managing optimistic updates
 * 
 * @param maxAge - Maximum age in ms before auto-cleanup (default: 30s)
 * @returns Object with optimistic update utilities
 * 
 * @example
 * ```tsx
 * const { add, confirm, rollback, getPending } = useOptimisticUpdate<CanvasData>();
 * 
 * const handleCanvasUpdate = async (data: CanvasData) => {
 *   const updateId = `update-${Date.now()}`;
 *   
 *   // Apply optimistic update
 *   add(updateId, data);
 *   setCanvasData(data);
 *   
 *   try {
 *     await saveToServer(data);
 *     confirm(updateId);
 *   } catch (error) {
 *     const rolledBackData = rollback(updateId);
 *     if (rolledBackData) {
 *       setCanvasData(rolledBackData);
 *     }
 *   }
 * };
 * ```
 */
export function useOptimisticUpdate<T = any>(maxAge: number = 30000): {
    add: (id: string, data: T) => void;
    confirm: (id: string) => boolean;
    rollback: (id: string) => T | undefined;
    get: (id: string) => OptimisticUpdate<T> | undefined;
    has: (id: string) => boolean;
    isConfirmed: (id: string) => boolean;
    getPending: () => OptimisticUpdate<T>[];
    getConfirmed: () => OptimisticUpdate<T>[];
    clear: () => void;
    getStats: () => {
        total: number;
        pending: number;
        confirmed: number;
        oldestAge: number | null;
    };
} {
    const managerRef = useRef<OptimisticUpdateManager<T> | null>(null);

    // Create manager on mount
    useEffect(() => {
        managerRef.current = createOptimisticUpdateManager<T>(maxAge);

        return () => {
            if (managerRef.current) {
                managerRef.current.destroy();
                managerRef.current = null;
            }
        };
    }, [maxAge]);

    const add = useCallback((id: string, data: T) => {
        if (managerRef.current) {
            managerRef.current.add(id, data);
        }
    }, []);

    const confirm = useCallback((id: string): boolean => {
        if (managerRef.current) {
            return managerRef.current.confirm(id);
        }
        return false;
    }, []);

    const rollback = useCallback((id: string): T | undefined => {
        if (managerRef.current) {
            return managerRef.current.rollback(id);
        }
        return undefined;
    }, []);

    const get = useCallback((id: string): OptimisticUpdate<T> | undefined => {
        if (managerRef.current) {
            return managerRef.current.get(id);
        }
        return undefined;
    }, []);

    const has = useCallback((id: string): boolean => {
        if (managerRef.current) {
            return managerRef.current.has(id);
        }
        return false;
    }, []);

    const isConfirmed = useCallback((id: string): boolean => {
        if (managerRef.current) {
            return managerRef.current.isConfirmed(id);
        }
        return false;
    }, []);

    const getPending = useCallback((): OptimisticUpdate<T>[] => {
        if (managerRef.current) {
            return managerRef.current.getPending();
        }
        return [];
    }, []);

    const getConfirmed = useCallback((): OptimisticUpdate<T>[] => {
        if (managerRef.current) {
            return managerRef.current.getConfirmed();
        }
        return [];
    }, []);

    const clear = useCallback(() => {
        if (managerRef.current) {
            managerRef.current.clear();
        }
    }, []);

    const getStats = useCallback(() => {
        if (managerRef.current) {
            return managerRef.current.getStats();
        }
        return {
            total: 0,
            pending: 0,
            confirmed: 0,
            oldestAge: null
        };
    }, []);

    return {
        add,
        confirm,
        rollback,
        get,
        has,
        isConfirmed,
        getPending,
        getConfirmed,
        clear,
        getStats
    };
}

/**
 * Hook for managing optimistic updates with state
 * 
 * This hook combines optimistic update management with React state,
 * providing a complete solution for optimistic UI updates.
 * 
 * @param initialData - Initial data value
 * @param maxAge - Maximum age in ms before auto-cleanup (default: 30s)
 * @returns Object with state and optimistic update utilities
 * 
 * @example
 * ```tsx
 * const {
 *   data,
 *   setData,
 *   applyOptimistic,
 *   confirmUpdate,
 *   rollbackUpdate,
 *   pendingCount
 * } = useOptimisticUpdateWithState<CanvasData>(initialCanvas);
 * 
 * const handleCanvasUpdate = async (newData: CanvasData) => {
 *   const updateId = await applyOptimistic(newData, async (data) => {
 *     await saveToServer(data);
 *   });
 * };
 * ```
 */
export function useOptimisticUpdateWithState<T>(
    initialData: T,
    maxAge: number = 30000
): {
    data: T;
    setData: (data: T) => void;
    applyOptimistic: (
        data: T,
        serverUpdate: (data: T) => Promise<void>
    ) => Promise<string>;
    confirmUpdate: (id: string) => boolean;
    rollbackUpdate: (id: string) => void;
    pendingCount: number;
    stats: {
        total: number;
        pending: number;
        confirmed: number;
        oldestAge: number | null;
    };
} {
    const [data, setData] = useState<T>(initialData);
    const [pendingCount, setPendingCount] = useState(0);
    const optimistic = useOptimisticUpdate<T>(maxAge);
    const previousDataRef = useRef<T>(initialData);

    // Update pending count when stats change
    useEffect(() => {
        const stats = optimistic.getStats();
        setPendingCount(stats.pending);
    }, [optimistic]);

    const applyOptimistic = useCallback(
        async (
            newData: T,
            serverUpdate: (data: T) => Promise<void>
        ): Promise<string> => {
            const updateId = `update-${Date.now()}-${Math.random()}`;

            // Store previous data
            previousDataRef.current = data;

            // Add optimistic update
            optimistic.add(updateId, previousDataRef.current);

            // Apply optimistic update to state
            setData(newData);

            try {
                // Perform server update
                await serverUpdate(newData);

                // Confirm the update
                optimistic.confirm(updateId);

                return updateId;
            } catch (error) {
                // Rollback on error
                const rolledBackData = optimistic.rollback(updateId);

                if (rolledBackData !== undefined) {
                    setData(rolledBackData);
                }

                throw error;
            }
        },
        [data, optimistic]
    );

    const confirmUpdate = useCallback(
        (id: string): boolean => {
            return optimistic.confirm(id);
        },
        [optimistic]
    );

    const rollbackUpdate = useCallback(
        (id: string) => {
            const rolledBackData = optimistic.rollback(id);

            if (rolledBackData !== undefined) {
                setData(rolledBackData);
            }
        },
        [optimistic]
    );

    return {
        data,
        setData,
        applyOptimistic,
        confirmUpdate,
        rollbackUpdate,
        pendingCount,
        stats: optimistic.getStats()
    };
}
