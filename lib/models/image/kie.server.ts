import { env } from '@/lib/env';
import type { ImageModel } from 'ai';
import { currentUser } from '@/lib/auth';
import { createFalJob } from '@/lib/fal-jobs';
import { database } from '@/lib/database';
import { falJobs } from '@/schema';
import { eq } from 'drizzle-orm';

const models = [
    'google/nano-banana',
    'google/nano-banana-edit',
] as const;

type KieModel = (typeof models)[number];

/**
 * Maximum number of images supported by KIE.ai edit models
 */
const MAX_KIE_IMAGES = 10;

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
    request_id?: string;
    [key: string]: unknown;
}

/**
 * Kie.ai API input structure
 */
interface KieApiInput {
    prompt: string;
    output_format: 'png' | 'jpeg' | 'webp';
    image_size: string;
    /** 
     * Array of image URLs for edit models
     * @remarks Supports up to 10 images. Additional images will be ignored.
     * @see MAX_KIE_IMAGES
     */
    image_urls?: string[];
    /** Internal metadata for webhook processing */
    _metadata?: {
        nodeId?: string;
        projectId?: string;
    };
}

/**
 * Extracts request ID from Kie.ai API response
 * Tries multiple possible locations in the response object
 */
function extractRequestId(response: KieApiResponse): string | null {
    return (
        response.data?.taskId ||
        response.data?.recordId ||
        response.data?.id ||
        response.taskId ||
        response.recordId ||
        response.id ||
        response.request_id ||
        null
    );
}



export const kieAIServer = {
    image: (modelId: KieModel): ImageModel => ({
        modelId,
        provider: 'kie',
        specificationVersion: 'v2',
        maxImagesPerCall: 1,
        doGenerate: async ({
            prompt,
            size,
            providerOptions,
        }) => {
            // KIE.ai expects aspect ratio format directly (e.g., "1:1", "16:9", "auto")
            const imageSize = size || '1:1'; // Default to 1:1 if not provided

            console.log('🔍 KIE image_size:', {
                size: imageSize,
                modelId,
            });

            const input: KieApiInput = {
                prompt,
                output_format: 'png',
                image_size: imageSize, // Pass aspect ratio directly (e.g., "1:1", "16:9", "auto")
            };

            // Handle image input for both generation and edit models
            const isEditModel = modelId.includes('-edit');
            const imageUrl = typeof providerOptions?.kie?.image === 'string'
                ? providerOptions.kie.image
                : undefined;
            const imageUrls = Array.isArray(providerOptions?.kie?.images)
                ? providerOptions.kie.images.filter((url): url is string => typeof url === 'string')
                : undefined;

            // Both generation and edit models can accept images
            // Edit models require images, generation models use them as reference
            if (imageUrls && imageUrls.length > 0) {
                console.log(`🖼️ Adding ${imageUrls.length} image(s) to KIE ${isEditModel ? 'edit' : 'generation'} request`);
                input.image_urls = imageUrls.slice(0, MAX_KIE_IMAGES);

                if (imageUrls.length > MAX_KIE_IMAGES) {
                    console.warn(`⚠️ KIE.ai supports max ${MAX_KIE_IMAGES} images. ${imageUrls.length - MAX_KIE_IMAGES} image(s) ignored.`);
                }
            } else if (imageUrl) {
                console.log(`🖼️ Adding single image to KIE ${isEditModel ? 'edit' : 'generation'} request`);
                input.image_urls = [imageUrl]; // Convert to array
            } else if (isEditModel) {
                console.warn('⚠️ Edit model called without image input - this may fail');
            }

            console.log('🔍 Kie.ai queue request:', {
                modelId,
                isEditModel,
                hasImage: !!imageUrl,
                hasImages: !!(imageUrls && imageUrls.length > 0),
                imageCount: imageUrls?.length ?? (imageUrl ? 1 : 0),
                inputKeys: Object.keys(input),
                fullInput: JSON.stringify(input, null, 2),
            });

            // Kie.ai funciona APENAS com webhooks
            const useWebhook = !!process.env.NEXT_PUBLIC_APP_URL;
            const webhookUrl = useWebhook
                ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie`
                : undefined;

            console.log('🚀 Kie.ai submission mode:', {
                mode: useWebhook ? 'WEBHOOK (required)' : 'ERROR - webhook required',
                webhookUrl: webhookUrl || 'N/A',
                hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
                appUrl: process.env.NEXT_PUBLIC_APP_URL,
            });

            if (!useWebhook) {
                throw new Error(
                    'Kie.ai requires webhook configuration. Please set NEXT_PUBLIC_APP_URL environment variable. ' +
                    'The Kie.ai API does not support polling for job status - it only works with webhooks.'
                );
            }

            // Modo webhook: salvar job ANTES de submeter
            const user = await currentUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Gerar um request_id temporário
            const tempRequestId = `kie_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

            console.log('Pre-creating Kie.ai job to avoid race condition...');

            // Extrair metadados do providerOptions
            const nodeId = providerOptions?.kie?.nodeId;
            const projectId = providerOptions?.kie?.projectId;

            const jobId = await createFalJob({
                requestId: tempRequestId,
                userId: user.id,
                modelId,
                type: 'image',
                input: {
                    ...input,
                    // Adicionar metadados para atualização do project
                    _metadata: {
                        nodeId,
                        projectId,
                    },
                },
            });

            console.log('Kie.ai job pre-created with ID:', jobId);

            // Submeter para a API Kie.ai
            let submission: KieApiResponse;
            try {
                const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${env.KIE_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: modelId,
                        callBackUrl: webhookUrl,
                        input,
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Kie.ai API error:', {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText,
                    });
                    throw new Error(`Kie.ai API error: ${response.status} ${response.statusText}`);
                }

                submission = await response.json() as KieApiResponse;

                console.log('📥 Kie.ai API response:', {
                    fullResponse: JSON.stringify(submission, null, 2),
                    hasData: !!submission.data,
                    dataKeys: submission.data ? Object.keys(submission.data) : [],
                    topLevelKeys: Object.keys(submission),
                });
            } catch (error) {
                console.error('❌ Failed to submit job to Kie.ai:', error);
                throw new Error(
                    `Failed to submit job to Kie.ai: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }

            // Extract request ID using helper function
            const request_id = extractRequestId(submission);

            if (!request_id) {
                console.error('❌ Could not find request ID in response:', submission);
                throw new Error(
                    'Kie.ai API did not return a valid request ID. ' +
                    'Expected one of: data.taskId, data.recordId, data.id, taskId, recordId, id, request_id'
                );
            }

            console.log('Kie.ai queue submitted:', { request_id, useWebhook });

            // Atualizar o job com o request_id real
            await database
                .update(falJobs)
                .set({ requestId: request_id })
                .where(eq(falJobs.id, jobId));

            // Retornar estrutura compatível com AI SDK
            // IMPORTANTE: NÃO incluir 'images' para forçar modo webhook
            return {
                warnings: [],
                response: {
                    timestamp: new Date(),
                    modelId,
                    headers: {
                        'x-kie-request-id': request_id,
                        'x-kie-status': 'pending',
                    },
                },
            } as any;
        },
    }),
};