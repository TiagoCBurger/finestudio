/**
 * Fal.ai Image Provider (v2)
 * 
 * Refactored provider using ImageProviderBase for cleaner, more maintainable code.
 * Handles image generation and editing using Fal.ai API.
 */

import { fal } from '@fal-ai/client';
import { env } from '@/lib/env';
import { ImageProviderBase } from './provider-base';
import type {
    ImageGenerationInput,
    JobSubmissionResult,
} from './types';

/**
 * Fal.ai specific input structure
 */
interface FalApiInput {
    prompt: string;
    num_images: number;
    image_size?: {
        width: number;
        height: number;
    };
    image_url?: string;
    image_urls?: string[];
    strength?: number;
    seed?: number;
}

/**
 * Fal.ai Image Provider
 * 
 * Supports:
 * - Text-to-image generation
 * - Image-to-image editing
 * - Multiple image inputs (for models like Nano Banana)
 * - Webhook-based async processing
 */
export class FalImageProvider extends ImageProviderBase {
    readonly providerName = 'fal';

    /**
     * Submit job to Fal.ai API
     * 
     * @param input - Image generation input
     * @returns Job submission result with request ID
     */
    protected async submitToExternalAPI(
        input: ImageGenerationInput
    ): Promise<JobSubmissionResult> {
        // Configure Fal.ai credentials
        fal.config({
            credentials: env.FAL_API_KEY,
        });

        // Prepare input for Fal.ai API
        const falInput = this.prepareFalInput(input);

        console.log('[Fal] Submitting job:', {
            modelId: input.modelId,
            hasImages: !!input.images?.length,
            imageCount: input.images?.length || 0,
            size: input.size,
        });

        // Determine if webhook is available
        const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/fal`
            : undefined;

        if (!webhookUrl) {
            throw new Error(
                'NEXT_PUBLIC_APP_URL is required for Fal.ai webhook mode. ' +
                'Please configure it in your environment variables.'
            );
        }

        console.log('[Fal] Using webhook mode:', webhookUrl);

        // Submit to Fal.ai queue
        const submission = await fal.queue.submit(input.modelId, {
            input: falInput,
            webhookUrl,
        });

        console.log('[Fal] Job submitted successfully:', {
            requestId: submission.request_id,
            webhookUrl,
        });

        // Return result (webhook will complete later)
        return {
            requestId: submission.request_id,
            jobId: '', // Will be filled by base class
            status: 'pending',
        };
    }

    /**
     * Prepare input for Fal.ai API based on model type
     */
    private prepareFalInput(input: ImageGenerationInput): FalApiInput {
        const falInput: FalApiInput = {
            prompt: input.prompt,
            num_images: 1,
        };

        // Parse size if provided
        if (input.size) {
            const parsedSize = this.parseSize(input.size);
            if (parsedSize) {
                falInput.image_size = parsedSize;
            }
        }

        // Handle image inputs based on model type
        const isNanoBanana = input.modelId === 'fal-ai/nano-banana/edit';
        const isGptImageEdit = input.modelId === 'fal-ai/gpt-image-1/edit-image/byok';
        const isFluxImageToImage = input.modelId === 'fal-ai/flux/dev/image-to-image';

        if (isNanoBanana) {
            // Nano Banana supports multiple images natively
            if (input.images && input.images.length > 0) {
                falInput.image_urls = input.images;
                falInput.strength = 0.75;
            } else {
                throw new Error(
                    'Nano Banana model requires at least one image. ' +
                    'Please connect an image node to this node.'
                );
            }
        } else if (isGptImageEdit) {
            // GPT Image Edit requires image_urls array
            if (input.images && input.images.length > 0) {
                falInput.image_urls = input.images;
            } else {
                throw new Error(
                    'GPT Image Edit model requires at least one image. ' +
                    'Please connect an image node to this node.'
                );
            }

            // OpenAI API key is required for BYOK model
            const openaiKey = env.OPENAI_API_KEY;
            if (!openaiKey) {
                throw new Error(
                    'OpenAI API key is required for GPT Image Edit model. ' +
                    'Please configure OPENAI_API_KEY in your environment variables.'
                );
            }
            (falInput as any).openai_api_key = openaiKey;
        } else if (isFluxImageToImage) {
            // FLUX Dev Image-to-Image uses single image_url
            if (input.images && input.images.length > 0) {
                falInput.image_url = input.images[0];
                falInput.strength = 0.95;
            }
        } else {
            // Standard FLUX models (text-to-image)
            // Images are optional for these models
            if (input.images && input.images.length > 0) {
                falInput.image_url = input.images[0];
                falInput.strength = 0.75;
            }
        }

        return falInput;
    }

    /**
     * Parse size string to width/height object
     * 
     * @param size - Size string (e.g., "1024x768")
     * @returns Width and height object, or null if invalid
     */
    private parseSize(size: string): { width: number; height: number } | null {
        if (!size || !size.includes('x')) {
            return null;
        }

        const parts = size.split('x');
        if (parts.length !== 2) {
            return null;
        }

        const width = Number(parts[0]);
        const height = Number(parts[1]);

        if (isNaN(width) || isNaN(height)) {
            return null;
        }

        return { width, height };
    }
}
