/**
 * Image Provider Factory
 * 
 * Factory function to get the appropriate image provider based on model ID.
 * This centralizes provider selection logic and makes it easy to add new providers.
 */

import { FalImageProvider } from './fal.server.v2';
import { KieImageProvider } from './kie.server.v2';
import type { ImageProviderBase } from './provider-base';

/**
 * Get image provider for a given model ID
 * 
 * @param modelId - The model ID (e.g., 'fal-nano-banana', 'kie-nano-banana')
 * @returns Image provider instance
 * @throws Error if model ID is not recognized
 * 
 * @example
 * ```typescript
 * const provider = getProviderForModel('fal-nano-banana');
 * const result = await provider.generateImage(input);
 * ```
 */
export function getProviderForModel(modelId: string): ImageProviderBase {
    // Fal.ai models start with 'fal-'
    if (modelId.startsWith('fal-')) {
        return new FalImageProvider();
    }

    // Kie.ai models start with 'kie-'
    if (modelId.startsWith('kie-')) {
        return new KieImageProvider();
    }

    // Unknown provider
    throw new Error(
        `Unknown provider for model: ${modelId}. ` +
        `Supported prefixes: 'fal-', 'kie-'`
    );
}

/**
 * Check if a model ID is supported
 * 
 * @param modelId - The model ID to check
 * @returns True if model is supported, false otherwise
 * 
 * @example
 * ```typescript
 * if (isModelSupported('fal-nano-banana')) {
 *   // Model is supported
 * }
 * ```
 */
export function isModelSupported(modelId: string): boolean {
    try {
        getProviderForModel(modelId);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get provider name for a model ID
 * 
 * @param modelId - The model ID
 * @returns Provider name (e.g., 'fal', 'kie')
 * @throws Error if model ID is not recognized
 * 
 * @example
 * ```typescript
 * const providerName = getProviderName('fal-nano-banana'); // 'fal'
 * ```
 */
export function getProviderName(modelId: string): string {
    const provider = getProviderForModel(modelId);
    return provider.providerName;
}
