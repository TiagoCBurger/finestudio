/**
 * Tests for realtime performance optimizations
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
    MessageBatcher,
    DebouncedUpdate,
    OptimisticUpdateManager,
    createMessageBatcher,
    createDebouncedUpdate,
    createOptimisticUpdateManager,
    type BroadcastMessage
} from '../realtime-performance';

describe('MessageBatcher', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('should batch messages and flush after delay', async () => {
        const flushedMessages: BroadcastMessage[][] = [];
        const batcher = new MessageBatcher(100, 50, (messages) => {
            flushedMessages.push(messages);
        });

        const message1: BroadcastMessage = {
            topic: 'test:1',
            event: 'update',
            payload: { data: 1 },
            timestamp: Date.now()
        };

        const message2: BroadcastMessage = {
            topic: 'test:1',
            event: 'update',
            payload: { data: 2 },
            timestamp: Date.now()
        };

        batcher.batch(message1);
        batcher.batch(message2);

        expect(batcher.getQueueSize()).toBe(2);
        expect(flushedMessages.length).toBe(0);

        // Fast-forward time
        jest.advanceTimersByTime(100);

        expect(flushedMessages.length).toBe(1);
        expect(flushedMessages[0]).toHaveLength(2);
        expect(batcher.getQueueSize()).toBe(0);

        batcher.destroy();
    });

    it('should force flush when max batch size is reached', () => {
        const flushedMessages: BroadcastMessage[][] = [];
        const batcher = new MessageBatcher(100, 3, (messages) => {
            flushedMessages.push(messages);
        });

        for (let i = 0; i < 3; i++) {
            batcher.batch({
                topic: 'test:1',
                event: 'update',
                payload: { data: i },
                timestamp: Date.now()
            });
        }

        // Should flush immediately when max size is reached
        expect(flushedMessages.length).toBe(1);
        expect(flushedMessages[0]).toHaveLength(3);
        expect(batcher.getQueueSize()).toBe(0);

        batcher.destroy();
    });

    it('should handle async flush callback', async () => {
        let flushCount = 0;
        const batcher = new MessageBatcher(100, 50, async (messages) => {
            await new Promise(resolve => setTimeout(resolve, 50));
            flushCount++;
        });

        batcher.batch({
            topic: 'test:1',
            event: 'update',
            payload: { data: 1 },
            timestamp: Date.now()
        });

        jest.advanceTimersByTime(100);

        // Wait for async flush
        await jest.runAllTimersAsync();

        expect(flushCount).toBe(1);

        batcher.destroy();
    });

    it('should clear queue without flushing', () => {
        const flushedMessages: BroadcastMessage[][] = [];
        const batcher = new MessageBatcher(100, 50, (messages) => {
            flushedMessages.push(messages);
        });

        batcher.batch({
            topic: 'test:1',
            event: 'update',
            payload: { data: 1 },
            timestamp: Date.now()
        });

        expect(batcher.getQueueSize()).toBe(1);

        batcher.clear();

        expect(batcher.getQueueSize()).toBe(0);
        expect(flushedMessages.length).toBe(0);

        batcher.destroy();
    });

    it('should create batcher with helper function', () => {
        const onFlush = jest.fn();
        const batcher = createMessageBatcher(onFlush, 50, 25);

        expect(batcher).toBeInstanceOf(MessageBatcher);

        batcher.destroy();
    });
});

describe('DebouncedUpdate', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('should debounce updates', () => {
        const callback = jest.fn();
        const debounced = new DebouncedUpdate(callback, 100);

        debounced.update({ data: 1 });
        debounced.update({ data: 2 });
        debounced.update({ data: 3 });

        expect(callback).not.toHaveBeenCalled();

        jest.advanceTimersByTime(100);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith({ data: 3 });

        debounced.destroy();
    });

    it('should reset timer on each update', () => {
        const callback = jest.fn();
        const debounced = new DebouncedUpdate(callback, 100);

        debounced.update({ data: 1 });

        jest.advanceTimersByTime(50);

        debounced.update({ data: 2 });

        jest.advanceTimersByTime(50);

        expect(callback).not.toHaveBeenCalled();

        jest.advanceTimersByTime(50);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith({ data: 2 });

        debounced.destroy();
    });

    it('should flush immediately', () => {
        const callback = jest.fn();
        const debounced = new DebouncedUpdate(callback, 100);

        debounced.update({ data: 1 });

        expect(callback).not.toHaveBeenCalled();

        debounced.flush();

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith({ data: 1 });

        debounced.destroy();
    });

    it('should cancel pending update', () => {
        const callback = jest.fn();
        const debounced = new DebouncedUpdate(callback, 100);

        debounced.update({ data: 1 });

        debounced.cancel();

        jest.advanceTimersByTime(100);

        expect(callback).not.toHaveBeenCalled();

        debounced.destroy();
    });

    it('should track statistics', () => {
        const callback = jest.fn();
        const debounced = new DebouncedUpdate(callback, 100);

        debounced.update({ data: 1 });
        debounced.update({ data: 2 });

        const stats = debounced.getStats();

        expect(stats.callCount).toBe(2);
        expect(stats.hasPending).toBe(true);
        expect(stats.lastCallTime).toBeGreaterThan(0);

        debounced.destroy();
    });

    it('should create debounced update with helper function', () => {
        const callback = jest.fn();
        const debounced = createDebouncedUpdate(callback, 50);

        expect(debounced).toBeInstanceOf(DebouncedUpdate);

        debounced.destroy();
    });
});

describe('OptimisticUpdateManager', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('should add optimistic updates', () => {
        const manager = new OptimisticUpdateManager<{ value: number }>();

        manager.add('update1', { value: 1 });
        manager.add('update2', { value: 2 });

        expect(manager.size()).toBe(2);
        expect(manager.has('update1')).toBe(true);
        expect(manager.has('update2')).toBe(true);

        manager.destroy();
    });

    it('should confirm updates', () => {
        const manager = new OptimisticUpdateManager<{ value: number }>();

        manager.add('update1', { value: 1 });

        expect(manager.isConfirmed('update1')).toBe(false);

        manager.confirm('update1');

        expect(manager.isConfirmed('update1')).toBe(true);

        manager.destroy();
    });

    it('should rollback updates', () => {
        const manager = new OptimisticUpdateManager<{ value: number }>();

        manager.add('update1', { value: 1 });

        const rolledBack = manager.rollback('update1');

        expect(rolledBack).toEqual({ value: 1 });
        expect(manager.has('update1')).toBe(false);

        manager.destroy();
    });

    it('should get pending updates', () => {
        const manager = new OptimisticUpdateManager<{ value: number }>();

        manager.add('update1', { value: 1 });
        manager.add('update2', { value: 2 });
        manager.confirm('update1');

        const pending = manager.getPending();

        expect(pending).toHaveLength(1);
        expect(pending[0].id).toBe('update2');

        manager.destroy();
    });

    it('should get confirmed updates', () => {
        const manager = new OptimisticUpdateManager<{ value: number }>();

        manager.add('update1', { value: 1 });
        manager.add('update2', { value: 2 });
        manager.confirm('update1');

        const confirmed = manager.getConfirmed();

        expect(confirmed).toHaveLength(1);
        expect(confirmed[0].id).toBe('update1');

        manager.destroy();
    });

    it('should cleanup old updates', () => {
        const manager = new OptimisticUpdateManager<{ value: number }>(1000);

        manager.add('update1', { value: 1 });
        manager.confirm('update1');

        expect(manager.size()).toBe(1);

        jest.advanceTimersByTime(2000);

        manager.cleanup();

        expect(manager.size()).toBe(0);

        manager.destroy();
    });

    it('should auto-cleanup periodically', () => {
        const manager = new OptimisticUpdateManager<{ value: number }>(1000);

        manager.add('update1', { value: 1 });
        manager.confirm('update1');

        expect(manager.size()).toBe(1);

        // Fast-forward past maxAge and cleanup interval
        jest.advanceTimersByTime(11000);

        expect(manager.size()).toBe(0);

        manager.destroy();
    });

    it('should get statistics', () => {
        const manager = new OptimisticUpdateManager<{ value: number }>();

        manager.add('update1', { value: 1 });
        manager.add('update2', { value: 2 });
        manager.confirm('update1');

        const stats = manager.getStats();

        expect(stats.total).toBe(2);
        expect(stats.pending).toBe(1);
        expect(stats.confirmed).toBe(1);
        expect(stats.oldestAge).toBeGreaterThanOrEqual(0);

        manager.destroy();
    });

    it('should clear all updates', () => {
        const manager = new OptimisticUpdateManager<{ value: number }>();

        manager.add('update1', { value: 1 });
        manager.add('update2', { value: 2 });

        expect(manager.size()).toBe(2);

        manager.clear();

        expect(manager.size()).toBe(0);

        manager.destroy();
    });

    it('should create manager with helper function', () => {
        const manager = createOptimisticUpdateManager<{ value: number }>(5000);

        expect(manager).toBeInstanceOf(OptimisticUpdateManager);

        manager.destroy();
    });
});
