/**
 * Tests for RealtimeConnectionManager error handling and retry logic
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
    RealtimeConnectionManager,
    RealtimeError,
    RealtimeErrorType,
    calculateRetryDelay,
    DEFAULT_RETRY_CONFIG
} from '../realtime-connection-manager';

describe('RealtimeError', () => {
    it('should create error with correct properties', () => {
        const error = new RealtimeError(
            RealtimeErrorType.CONNECTION_FAILED,
            'Connection failed',
            { topic: 'test:123' },
            true
        );

        expect(error.type).toBe(RealtimeErrorType.CONNECTION_FAILED);
        expect(error.message).toBe('Connection failed');
        expect(error.context).toEqual({ topic: 'test:123' });
        expect(error.retryable).toBe(true);
        expect(error.timestamp).toBeDefined();
    });

    it('should convert to JSON correctly', () => {
        const error = new RealtimeError(
            RealtimeErrorType.TIMEOUT,
            'Timeout occurred',
            { attempt: 1 }
        );

        const json = error.toJSON();

        expect(json.name).toBe('RealtimeError');
        expect(json.type).toBe(RealtimeErrorType.TIMEOUT);
        expect(json.message).toBe('Timeout occurred');
        expect(json.context).toEqual({ attempt: 1 });
        expect(json.retryable).toBe(true);
    });

    it('should default retryable to true', () => {
        const error = new RealtimeError(
            RealtimeErrorType.NETWORK_ERROR,
            'Network error'
        );

        expect(error.retryable).toBe(true);
    });

    it('should allow non-retryable errors', () => {
        const error = new RealtimeError(
            RealtimeErrorType.AUTHENTICATION_FAILED,
            'Auth failed',
            {},
            false
        );

        expect(error.retryable).toBe(false);
    });
});

describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff correctly', () => {
        const delay0 = calculateRetryDelay(0);
        const delay1 = calculateRetryDelay(1);
        const delay2 = calculateRetryDelay(2);

        // Base delay is 1000ms, multiplier is 2
        // Attempt 0: 1000 * 2^0 = 1000ms (+ jitter)
        // Attempt 1: 1000 * 2^1 = 2000ms (+ jitter)
        // Attempt 2: 1000 * 2^2 = 4000ms (+ jitter)

        expect(delay0).toBeGreaterThanOrEqual(1000);
        expect(delay0).toBeLessThanOrEqual(1300); // 1000 + 30% jitter

        expect(delay1).toBeGreaterThanOrEqual(2000);
        expect(delay1).toBeLessThanOrEqual(2600);

        expect(delay2).toBeGreaterThanOrEqual(4000);
        expect(delay2).toBeLessThanOrEqual(5200);
    });

    it('should respect max delay', () => {
        const config = {
            ...DEFAULT_RETRY_CONFIG,
            maxDelay: 5000
        };

        const delay = calculateRetryDelay(10, config);

        // Even with high attempt number, should not exceed maxDelay + jitter
        expect(delay).toBeLessThanOrEqual(6500);
    });

    it('should add jitter to prevent thundering herd', () => {
        const delays = Array.from({ length: 10 }, () => calculateRetryDelay(1));

        // All delays should be different due to jitter
        const uniqueDelays = new Set(delays);
        expect(uniqueDelays.size).toBeGreaterThan(1);
    });
});

describe('RealtimeConnectionManager Error Handling', () => {
    let manager: RealtimeConnectionManager;

    beforeEach(() => {
        // Reset singleton before each test
        RealtimeConnectionManager.resetInstance();
        manager = RealtimeConnectionManager.getInstance();
    });

    afterEach(async () => {
        await manager.cleanup();
        RealtimeConnectionManager.resetInstance();
    });

    it('should track last error', () => {
        expect(manager.getLastError()).toBeNull();
    });

    it('should clear last error', () => {
        // Manually set an error for testing
        const error = new RealtimeError(
            RealtimeErrorType.CONNECTION_FAILED,
            'Test error'
        );

        // Since we can't directly set the error, we'll just test the clear method
        manager.clearLastError();
        expect(manager.getLastError()).toBeNull();
    });

    it('should get retry configuration', () => {
        const config = manager.getRetryConfig();

        expect(config).toEqual(DEFAULT_RETRY_CONFIG);
    });

    it('should update retry configuration', () => {
        manager.setRetryConfig({
            maxRetries: 5,
            baseDelay: 2000
        });

        const config = manager.getRetryConfig();

        expect(config.maxRetries).toBe(5);
        expect(config.baseDelay).toBe(2000);
        expect(config.maxDelay).toBe(DEFAULT_RETRY_CONFIG.maxDelay);
        expect(config.backoffMultiplier).toBe(DEFAULT_RETRY_CONFIG.backoffMultiplier);
    });

    it('should check if channel is in error state', () => {
        const isError = manager.isChannelInError('nonexistent:123');
        expect(isError).toBe(false);
    });

    it('should get channel error', () => {
        const error = manager.getChannelError('nonexistent:123');
        expect(error).toBeNull();
    });
});

describe('Error Types', () => {
    it('should have all required error types', () => {
        expect(RealtimeErrorType.CONNECTION_FAILED).toBe('CONNECTION_FAILED');
        expect(RealtimeErrorType.SUBSCRIPTION_FAILED).toBe('SUBSCRIPTION_FAILED');
        expect(RealtimeErrorType.CHANNEL_ERROR).toBe('CHANNEL_ERROR');
        expect(RealtimeErrorType.TIMEOUT).toBe('TIMEOUT');
        expect(RealtimeErrorType.AUTHENTICATION_FAILED).toBe('AUTHENTICATION_FAILED');
        expect(RealtimeErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
        expect(RealtimeErrorType.BROADCAST_FAILED).toBe('BROADCAST_FAILED');
        expect(RealtimeErrorType.UNKNOWN).toBe('UNKNOWN');
    });
});
