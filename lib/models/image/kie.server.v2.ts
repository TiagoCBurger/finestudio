/**
 * Kie.ai Image Provider (v2)
 * 
 * Refactored provider using ImageProviderBase for cleaner, more maintainable code.
 * Handles image generation and editing using Kie.ai API.
 */

import { env } from '@/lib/env';
import { ImageProviderBase } from './provider-base';
import type {
    ImageGenerationInput,
    JobSubmissionResult,
} from './types';

/**
 * Maximum number of images supported by Kie.ai
 */
const MAX_KIE_IMAGES = 10;

/**
 * Kie.ai API input structure
 */
interface KieApiInput {
    prompt: string;
    output_format: 'png' | 'jpeg' | 'webp';
    image_size: string; // Aspect ratio format (e.g., "1:1", "16:9")
    image_urls?: string[];
}

/**
 * Kie.ai API response structure
 */
interface KieApiResponse {
    data?: {
        taskId?: string;
        recordId?: string;
        id?: string;
    };
    taskId?: string;
    recordId?: string;
    id?: string;
    [key: string]: unknown;
}

/**
 * Kie.ai Image Provider
 * 
 * Supports:
 * - Text-to-image generation
 * - Image-to-image editing
 * - Multiple image inputs (up to 10)
 * - Aspect ratio based sizing
 * - Webhook-based async processing (required)
 */
export class KieImageProvider extends ImageProviderBase {
    readonly providerName = 'kie';

    /**
     * Submit job to Kie.ai API
     * 
     * @param input - Image generation input
     * @returns Job submission result with request ID
     */
    protected async submitToExternalAPI(
        input: ImageGenerationInput
    ): Promise<JobSubmissionResult> {
        // Kie.ai requires webhook mode
        const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie`
            : undefined;

        if (!webhookUrl) {
            throw new Error(
                'NEXT_PUBLIC_APP_URL is required for Kie.ai webhook mode. ' +
                'Kie.ai API does not support polling - it only works with webhooks. ' +
                'Please configure NEXT_PUBLIC_APP_URL in your environment variables.'
            );
        }

        // Prepare input for Kie.ai API
        const kieInput = this.prepareKieInput(input);

        console.log('[Kie] Submitting job:', {
            modelId: input.modelId,
            hasImages: !!input.images?.length,
            imageCount: input.images?.length || 0,
            imageSize: kieInput.image_size,
        });

        // Submit to Kie.ai API
        const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.KIE_API_KEY}`,
            },
            body: JSON.stringify({
                model: input.modelId,
                callBackUrl: webhookUrl,
                input: kieInput,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Kie] API error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
            });
            throw new Error(
                `Kie.ai API error: ${response.status} ${response.statusText}`
            );
        }

        const result = await response.json() as KieApiResponse;

        console.log('[Kie] API response:', {
            hasData: !!result.data,
            dataKeys: result.data ? Object.keys(result.data) : [],
            topLevelKeys: Object.keys(result),
        });

        // Extract request ID from response
        const requestId = this.extractRequestId(result);

        if (!requestId) {
            console.error('[Kie] Could not find request ID in response:', result);
            throw new Error(
                'Kie.ai API did not return a valid request ID. ' +
                'Expected one of: data.taskId, data.recordId, data.id, taskId, recordId, id'
            );
        }

        console.log('[Kie] Job submitted successfully:', {
            requestId,
            webhookUrl,
        });

        // Return result (webhook will complete later)
        return {
            requestId,
            jobId: '', // Will be filled by base class
            status: 'pending',
        };
    }

    /**
     * Prepare input for Kie.ai API
     */
    private prepareKieInput(input: ImageGenerationInput): KieApiInput {
        const kieInput: KieApiInput = {
            prompt: input.prompt,
            output_format: 'png',
            image_size: input.size || '1:1', // Default to 1:1 if not provided
        };

        // Handle image inputs
        const isEditModel = input.modelId.includes('-edit');

        if (input.images && input.images.length > 0) {
            // Limit to max supported images
            if (input.images.length > MAX_KIE_IMAGES) {
                console.warn(
                    `[Kie] Too many images provided (${input.images.length}). ` +
                    `Using first ${MAX_KIE_IMAGES} images.`
                );
            }

            kieInput.image_urls = input.images.slice(0, MAX_KIE_IMAGES);

            console.log(
                `[Kie] Adding ${kieInput.image_urls.length} image(s) to ` +
                `${isEditModel ? 'edit' : 'generation'} request`
            );
        } else if (isEditModel) {
            console.warn('[Kie] Edit model called without image input - this may fail');
        }

        return kieInput;
    }

    /**
     * Extract request ID from Kie.ai API response
     * Tries multiple possible locations in the response object
     */
    private extractRequestId(response: KieApiResponse): string | null {
        return (
            response.data?.taskId ||
            response.data?.recordId ||
            response.data?.id ||
            response.taskId ||
            response.recordId ||
            response.id ||
            null
        );
    }
}
