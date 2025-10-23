/**
 * Image Generation Action (v2)
 * 
 * Refactored server action using new provider architecture.
 * Much simpler and cleaner than v1 - providers handle all the complexity.
 */

'use server';

import { getSubscribedUser } from '@/lib/auth';
import { withCreditCheck } from '@/lib/credits/middleware';
import { parseError } from '@/lib/error/parse';
import { getProviderForModel } from '@/lib/models/image/provider-factory';
import type {
    ImageGenerationInput,
    ImageGenerationResult,
} from '@/lib/models/image/types';

/**
 * Generate image using new provider architecture (v2)
 * 
 * This is the main entry point for image generation.
 * It's much simpler than v1 because providers handle all the complexity.
 * 
 * @param input - Image generation input
 * @returns Generation result with state or error
 */
async function _generateImageActionV2(
    input: ImageGenerationInput
): Promise<ImageGenerationResult> {
    try {
        // Verify user is authenticated
        await getSubscribedUser();

        console.log('[Action] Generating image:', {
            modelId: input.modelId,
            nodeId: input.nodeId,
            projectId: input.projectId,
            hasImages: !!input.images?.length,
            imageCount: input.images?.length || 0,
        });

        // Get provider for this model
        const provider = getProviderForModel(input.modelId);

        console.log('[Action] Using provider:', provider.providerName);

        // Provider handles everything:
        // - Validation
        // - Job creation
        // - Project update
        // - API submission
        // - Error handling
        const result = await provider.generateImage(input);

        if (result.success) {
            console.log('[Action] Image generation started:', {
                status: result.state.status,
                requestId: result.state.status === 'generating' ? result.state.requestId : undefined,
            });
        } else {
            console.error('[Action] Image generation failed:', {
                errorType: result.error.type,
                message: result.error.message,
                canRetry: result.error.canRetry,
            });
        }

        return result;
    } catch (error) {
        console.error('[Action] Unexpected error:', error);

        const message = parseError(error);

        return {
            success: false,
            error: {
                type: 'unknown',
                message,
                canRetry: true,
                silent: false,
                originalError: error,
            },
        };
    }
}

/**
 * Generate image with credit check
 * 
 * This is the version that should be used in production.
 * It automatically deducts credits based on the model.
 */
export const generateImageActionV2 = withCreditCheck(
    _generateImageActionV2,
    'dynamic', // Model ID will be extracted from input
);

/**
 * Generate image without credit check (for testing)
 * 
 * Use this only for development/testing.
 * In production, always use generateImageActionV2.
 */
export const generateImageActionV2NoCreditCheck = _generateImageActionV2;
