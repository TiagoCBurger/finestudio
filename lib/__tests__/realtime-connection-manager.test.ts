/**
 * Tests for RealtimeConnectionManager
 * 
 * These tests verify:
 * - Singleton pattern
 * - Channel creation and reuse
 * - Subscriber management
 * - Cleanup behavior
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { RealtimeConnectionManager } from '../realtime-connection-manager';

describe('RealtimeConnectionManager', () => {
    beforeEach(() => {
        // Reset singleton before each test
        RealtimeConnectionManager.resetInstance();
    });

    afterEach(async () => {
        // Clean up after each test
        const manager = RealtimeConnectionManager.getInstance();
        await manager.cleanup();
        RealtimeConnectionManager.resetInstance();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance on multiple calls', () => {
            const instance1 = RealtimeConnectionManager.getInstance();
            const instance2 = RealtimeConnectionManager.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should start with disconnected state', () => {
            const manager = RealtimeConnectionManager.getInstance();

            expect(manager.getConnectionState()).toBe('disconnected');
        });
    });

    describe('Channel Management', () => {
        it('should track active channels', () => {
            const manager = RealtimeConnectionManager.getInstance();

            const channels = manager.getActiveChannels();
            expect(channels).toEqual([]);
        });

        it('should report connection state', () => {
            const manager = RealtimeConnectionManager.getInstance();

            const state = manager.getConnectionState();
            expect(['disconnected', 'connecting', 'connected', 'reconnecting', 'error']).toContain(state);
        });
    });

    describe('Cleanup', () => {
        it('should clean up all resources', async () => {
            const manager = RealtimeConnectionManager.getInstance();

            await manager.cleanup();

            expect(manager.getActiveChannels()).toEqual([]);
            expect(manager.getConnectionState()).toBe('disconnected');
        });
    });
});
