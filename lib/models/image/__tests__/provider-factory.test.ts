/**
 * Tests for Provider Factory
 */

import { describe, it, expect } from '@jest/globals';
import {
    getProviderForModel,
    isModelSupported,
    getProviderName,
} from '../provider-factory';
import { FalImageProvider } from '../fal.server.v2';
import { KieImageProvider } from '../kie.server.v2';

describe('Provider Factory', () => {
    describe('getProviderForModel', () => {
        it('should return FalImageProvider for fal- models', () => {
            const provider = getProviderForModel('fal-nano-banana');
            expect(provider).toBeInstanceOf(FalImageProvider);
            expect(provider.providerName).toBe('fal');
        });

        it('should return KieImageProvider for kie- models', () => {
            const provider = getProviderForModel('kie-nano-banana');
            expect(provider).toBeInstanceOf(KieImageProvider);
            expect(provider.providerName).toBe('kie');
        });

        it('should throw error for unknown model', () => {
            expect(() => {
                getProviderForModel('unknown-model');
            }).toThrow('Unknown provider for model');
        });
    });

    describe('isModelSupported', () => {
        it('should return true for fal- models', () => {
            expect(isModelSupported('fal-nano-banana')).toBe(true);
        });

        it('should return true for kie- models', () => {
            expect(isModelSupported('kie-nano-banana')).toBe(true);
        });

        it('should return false for unknown models', () => {
            expect(isModelSupported('unknown-model')).toBe(false);
        });
    });

    describe('getProviderName', () => {
        it('should return "fal" for fal- models', () => {
            expect(getProviderName('fal-nano-banana')).toBe('fal');
        });

        it('should return "kie" for kie- models', () => {
            expect(getProviderName('kie-nano-banana')).toBe('kie');
        });

        it('should throw error for unknown models', () => {
            expect(() => {
                getProviderName('unknown-model');
            }).toThrow('Unknown provider for model');
        });
    });
});
