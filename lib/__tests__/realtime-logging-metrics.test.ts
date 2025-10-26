/**
 * Tests for Realtime Connection Manager logging and metrics
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RealtimeConnectionManager } from '../realtime-connection-manager';
import { realtimeLogger } from '../realtime-logger';

describe('RealtimeConnectionManager - Logging and Metrics', () => {
    let manager: RealtimeConnectionManager;

    beforeEach(() => {
        manager = RealtimeConnectionManager.getInstance();
        realtimeLogger.clearHistory();
    });

    afterEach(async () => {
        await manager.cleanup();
        RealtimeConnectionManager.resetInstance();
    });

    describe('Metrics Tracking', () => {
        it('should initialize with zero metrics', () => {
            const metrics = manager.getMetrics();

            expect(metrics.activeChannels).toBe(0);
            expect(metrics.totalSubscriptions).toBe(0);
            expect(metrics.messagesReceived).toBe(0);
            expect(metrics.messagesSent).toBe(0);
            expect(metrics.errorCount).toBe(0);
            expect(metrics.reconnectionCount).toBe(0);
        });

        it('should track connection uptime', () => {
            const metrics = manager.getMetrics();

            expect(metrics.connectionUptime).toBeGreaterThanOrEqual(0);
            expect(typeof metrics.connectionUptime).toBe('number');
        });

        it('should track last activity timestamp', () => {
            const metrics = manager.getMetrics();

            expect(metrics.lastActivityTimestamp).toBeGreaterThan(0);
            expect(typeof metrics.lastActivityTimestamp).toBe('number');
        });

        it('should have empty channels by topic initially', () => {
            const metrics = manager.getMetrics();

            expect(metrics.channelsByTopic.size).toBe(0);
        });

        it('should have empty errors by type initially', () => {
            const metrics = manager.getMetrics();

            expect(metrics.errorsByType.size).toBe(0);
        });
    });

    describe('Debug Info', () => {
        it('should provide comprehensive debug information', () => {
            const debugInfo = manager.getDebugInfo();

            expect(debugInfo).toHaveProperty('connectionState');
            expect(debugInfo).toHaveProperty('connectionUptime');
            expect(debugInfo).toHaveProperty('channels');
            expect(debugInfo).toHaveProperty('metrics');
            expect(debugInfo).toHaveProperty('recentErrors');
            expect(debugInfo).toHaveProperty('retryConfig');
        });

        it('should have correct connection state', () => {
            const debugInfo = manager.getDebugInfo();

            expect(['disconnected', 'connecting', 'connected', 'reconnecting', 'error'])
                .toContain(debugInfo.connectionState);
        });

        it('should have empty channels array initially', () => {
            const debugInfo = manager.getDebugInfo();

            expect(Array.isArray(debugInfo.channels)).toBe(true);
            expect(debugInfo.channels.length).toBe(0);
        });

        it('should have empty recent errors initially', () => {
            const debugInfo = manager.getDebugInfo();

            expect(Array.isArray(debugInfo.recentErrors)).toBe(true);
            expect(debugInfo.recentErrors.length).toBe(0);
        });

        it('should include retry configuration', () => {
            const debugInfo = manager.getDebugInfo();

            expect(debugInfo.retryConfig).toHaveProperty('maxRetries');
            expect(debugInfo.retryConfig).toHaveProperty('baseDelay');
            expect(debugInfo.retryConfig).toHaveProperty('maxDelay');
            expect(debugInfo.retryConfig).toHaveProperty('backoffMultiplier');
        });
    });

    describe('Log Debug Info Method', () => {
        it('should log debug info without errors', () => {
            expect(() => {
                manager.logDebugInfo();
            }).not.toThrow();
        });

        it('should create log entries when logging debug info', () => {
            const historyBefore = realtimeLogger.getHistory().length;

            manager.logDebugInfo();

            const historyAfter = realtimeLogger.getHistory().length;
            expect(historyAfter).toBeGreaterThan(historyBefore);
        });
    });

    describe('Connection State', () => {
        it('should return current connection state', () => {
            const state = manager.getConnectionState();

            expect(['disconnected', 'connecting', 'connected', 'reconnecting', 'error'])
                .toContain(state);
        });
    });

    describe('Active Channels', () => {
        it('should return empty array when no channels', () => {
            const channels = manager.getActiveChannels();

            expect(Array.isArray(channels)).toBe(true);
            expect(channels.length).toBe(0);
        });
    });

    describe('Retry Configuration', () => {
        it('should get retry configuration', () => {
            const config = manager.getRetryConfig();

            expect(config).toHaveProperty('maxRetries');
            expect(config).toHaveProperty('baseDelay');
            expect(config).toHaveProperty('maxDelay');
            expect(config).toHaveProperty('backoffMultiplier');
        });

        it('should update retry configuration', () => {
            const newConfig = {
                maxRetries: 5,
                baseDelay: 2000
            };

            manager.setRetryConfig(newConfig);
            const config = manager.getRetryConfig();

            expect(config.maxRetries).toBe(5);
            expect(config.baseDelay).toBe(2000);
        });
    });

    describe('Error Tracking', () => {
        it('should return null for last error initially', () => {
            const error = manager.getLastError();

            expect(error).toBeNull();
        });

        it('should clear last error', () => {
            manager.clearLastError();
            const error = manager.getLastError();

            expect(error).toBeNull();
        });

        it('should check if channel is in error state', () => {
            const isError = manager.isChannelInError('test:channel');

            expect(typeof isError).toBe('boolean');
            expect(isError).toBe(false);
        });

        it('should get channel error', () => {
            const error = manager.getChannelError('test:channel');

            expect(error).toBeNull();
        });
    });
});

describe('RealtimeLogger - Logging Capabilities', () => {
    beforeEach(() => {
        realtimeLogger.clearHistory();
    });

    describe('Log History', () => {
        it('should track log history', () => {
            realtimeLogger.info('Test message');

            const history = realtimeLogger.getHistory();
            expect(history.length).toBeGreaterThan(0);
        });

        it('should clear log history', () => {
            realtimeLogger.info('Test message');
            realtimeLogger.clearHistory();

            const history = realtimeLogger.getHistory();
            expect(history.length).toBe(0);
        });

        it('should include timestamp in log entries', () => {
            realtimeLogger.info('Test message');

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry).toHaveProperty('timestamp');
            expect(typeof lastEntry.timestamp).toBe('string');
        });

        it('should include level in log entries', () => {
            realtimeLogger.info('Test message');

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry).toHaveProperty('level');
            expect(['debug', 'info', 'warn', 'error']).toContain(lastEntry.level);
        });

        it('should include message in log entries', () => {
            const testMessage = 'Test message';
            realtimeLogger.info(testMessage);

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry).toHaveProperty('message');
            expect(lastEntry.message).toBe(testMessage);
        });

        it('should include context in log entries when provided', () => {
            const context = { key: 'value' };
            realtimeLogger.info('Test message', context);

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry).toHaveProperty('context');
            expect(lastEntry.context).toEqual(context);
        });
    });

    describe('Log Levels', () => {
        it('should log debug messages', () => {
            realtimeLogger.debug('Debug message');

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry.level).toBe('debug');
        });

        it('should log info messages', () => {
            realtimeLogger.info('Info message');

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry.level).toBe('info');
        });

        it('should log warning messages', () => {
            realtimeLogger.warn('Warning message');

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry.level).toBe('warn');
        });

        it('should log error messages', () => {
            realtimeLogger.error('Error message');

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry.level).toBe('error');
        });

        it('should log success messages', () => {
            realtimeLogger.success('Success message');

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry.level).toBe('info');
            expect(lastEntry.message).toContain('✅');
        });
    });

    describe('Specialized Logging Methods', () => {
        it('should log channel created event', () => {
            realtimeLogger.logChannelCreated('test:topic', { private: true });

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry.message).toContain('Channel created');
            expect(lastEntry.context).toHaveProperty('topic', 'test:topic');
        });

        it('should log channel reused event', () => {
            realtimeLogger.logChannelReused('test:topic', 2);

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry.message).toContain('Channel reused');
            expect(lastEntry.context).toHaveProperty('subscriberCount', 2);
        });

        it('should log subscription event', () => {
            realtimeLogger.logSubscription('test:topic', 'test_event', 'sub_123');

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry.message).toContain('Subscription created');
            expect(lastEntry.context).toHaveProperty('subscriberId', 'sub_123');
        });

        it('should log unsubscription event', () => {
            realtimeLogger.logUnsubscription('test:topic', 'sub_123', 1);

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry.message).toContain('Subscription removed');
            expect(lastEntry.context).toHaveProperty('remainingSubscribers', 1);
        });

        it('should log reconnection event', () => {
            realtimeLogger.logReconnection('test:topic', 1, 1000);

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry.message).toContain('Reconnection attempt');
            expect(lastEntry.context).toHaveProperty('attempt', 1);
            expect(lastEntry.context).toHaveProperty('delay', 1000);
        });

        it('should log metrics summary', () => {
            const metrics = {
                activeChannels: 2,
                totalSubscriptions: 5,
                messagesReceived: 10,
                messagesSent: 8,
                errorCount: 1,
                reconnectionCount: 0,
                uptime: 5000
            };

            realtimeLogger.logMetrics(metrics);

            const history = realtimeLogger.getHistory();
            const lastEntry = history[history.length - 1];

            expect(lastEntry.message).toContain('Metrics Summary');
            expect(lastEntry.context).toHaveProperty('activeChannels', 2);
            expect(lastEntry.context).toHaveProperty('totalSubscriptions', 5);
        });
    });
});
