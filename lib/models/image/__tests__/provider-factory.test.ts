/**
 * Testes para Provider Factory
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
    getImageProvider,
    getProviderByModelId,
    clearProviderCache,
    type ProviderType,
} from '../provider-factory';
import { KieImageProvider } from '../kie.server';

describe('Provider Factory', () => {
    beforeEach(() => {
        // Limpar cache antes de cada teste
        clearProviderCache();
    });

    describe('getImageProvider', () => {
        it('should create KIE provider', () => {
            const provider = getImageProvider('kie');
            expect(provider).toBeInstanceOf(KieImageProvider);
        });

        it('should cache provider instances', () => {
            const provider1 = getImageProvider('kie');
            const provider2 = getImageProvider('kie');
            expect(provider1).toBe(provider2); // Mesma instância
        });

        it('should throw error for unknown provider', () => {
            expect(() => {
                getImageProvider('unknown' as ProviderType);
            }).toThrow('Unknown provider type');
        });

        it('should throw error for fal provider (not implemented)', () => {
            expect(() => {
                getImageProvider('fal');
            }).toThrow('Fal provider not implemented yet in v2');
        });
    });

    describe('getProviderByModelId', () => {
        it('should return KIE provider for google/ models', () => {
            const provider = getProviderByModelId('google/nano-banana');
            expect(provider).toBeInstanceOf(KieImageProvider);
        });

        it('should return KIE provider for google/ edit models', () => {
            const provider = getProviderByModelId('google/nano-banana-edit');
            expect(provider).toBeInstanceOf(KieImageProvider);
        });

        it('should throw error for fal- models (not implemented)', () => {
            expect(() => {
                getProviderByModelId('fal-nano-banana');
            }).toThrow('Fal provider not implemented yet in v2');
        });

        it('should throw error for unknown model format', () => {
            expect(() => {
                getProviderByModelId('unknown-model');
            }).toThrow('Cannot determine provider for model');
        });
    });

    describe('clearProviderCache', () => {
        it('should clear cached providers', () => {
            const provider1 = getImageProvider('kie');
            clearProviderCache();
            const provider2 = getImageProvider('kie');
            expect(provider1).not.toBe(provider2); // Instâncias diferentes
        });
    });
});
