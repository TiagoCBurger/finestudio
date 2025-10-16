import { fal } from '@fal-ai/client';
import { env } from '@/lib/env';
import type { ImageModel, ImageModelCallWarning } from 'ai';
import { currentUser } from '@/lib/auth';
import { createFalJob, waitForFalJob } from '@/lib/fal-jobs';
import { database } from '@/lib/database';
import { falJobs } from '@/schema';
import { eq } from 'drizzle-orm';

const models = [
    'fal-ai/nano-banana/edit',
    'fal-ai/gpt-image',
    'fal-ai/gpt-image-1/edit-image/byok',
    'fal-ai/flux/dev/image-to-image',
    'fal-ai/flux-pro/kontext',
    'fal-ai/flux-pro/kontext/max/multi',
    'fal-ai/ideogram/character',
] as const;

type FalModel = (typeof models)[number];

type FalImageOutput = {
    images: Array<{
        url: string;
        width: number;
        height: number;
        content_type: string;
    }>;
    seed: number;
    has_nsfw_concepts?: boolean[];
    prompt: string;
};

export const falAIServer = {
    image: (modelId: FalModel): ImageModel => ({
        modelId,
        provider: 'fal',
        specificationVersion: 'v2',
        maxImagesPerCall: 1,
        doGenerate: async ({
            prompt,
            seed,
            size,
            providerOptions,
        }) => {
            const [width, height] = size?.split('x').map(Number) ?? [1024, 1024];

            // Build input based on model type
            const input: Record<string, unknown> = {
                prompt,
                num_images: 1,
            };

            // 🔍 DEBUG: Log completo dos providerOptions
            console.log('🔍 DEBUG providerOptions:', {
                hasProviderOptions: !!providerOptions,
                hasFal: !!providerOptions?.fal,
                falKeys: providerOptions?.fal ? Object.keys(providerOptions.fal) : [],
                falImage: providerOptions?.fal?.image,
                falImages: providerOptions?.fal?.images,
                fullProviderOptions: JSON.stringify(providerOptions, null, 2),
            });

            // Nano Banana has different format
            const isNanoBanana = modelId === 'fal-ai/nano-banana/edit';
            const isGptImageEdit = modelId === 'fal-ai/gpt-image-1/edit-image/byok';
            const isFluxImageToImage = modelId === 'fal-ai/flux/dev/image-to-image';

            if (isNanoBanana) {
                // Nano Banana supports multiple images natively!
                const images = providerOptions?.fal?.images;
                if (Array.isArray(images) && images.length > 0) {
                    input.image_urls = images; // Use all images
                    input.strength = 0.75;
                } else if (typeof providerOptions?.fal?.image === 'string') {
                    input.image_urls = [providerOptions.fal.image]; // Single image
                    input.strength = 0.75;
                } else {
                    // Nano Banana REQUIRES images
                    throw new Error('Nano Banana model requires at least one image. Please connect an image node to this node.');
                }
            } else if (isGptImageEdit) {
                // GPT Image Edit requires image_urls array and OpenAI API key
                const images = providerOptions?.fal?.images;
                if (Array.isArray(images) && images.length > 0) {
                    input.image_urls = images;
                } else if (typeof providerOptions?.fal?.image === 'string') {
                    input.image_urls = [providerOptions.fal.image];
                } else {
                    // GPT Image Edit REQUIRES images
                    throw new Error('GPT Image Edit model requires at least one image. Please connect an image node to this node.');
                }

                // OpenAI API key is required for BYOK model
                const openaiKey = providerOptions?.fal?.openai_api_key || env.OPENAI_API_KEY;
                if (!openaiKey) {
                    throw new Error('OpenAI API key is required for GPT Image Edit model');
                }
                input.openai_api_key = openaiKey;
            } else if (isFluxImageToImage) {
                // FLUX Dev Image-to-Image
                input.image_size = {
                    width,
                    height,
                };

                if (typeof providerOptions?.fal?.image === 'string') {
                    input.image_url = providerOptions.fal.image;
                    const strengthValue = providerOptions?.fal?.strength;
                    input.strength = typeof strengthValue === 'string' ? parseFloat(strengthValue) :
                        typeof strengthValue === 'number' ? strengthValue : 0.95;
                }
            } else {
                // Standard FLUX models
                input.image_size = {
                    width,
                    height,
                };

                if (typeof providerOptions?.fal?.image === 'string') {
                    input.image_url = providerOptions.fal.image;
                    input.strength = 0.75;
                }
            }

            if (seed !== undefined) {
                input.seed = seed;
            }

            console.log('🔍 Fal.ai queue request:', {
                modelId,
                isNanoBanana: modelId === 'fal-ai/nano-banana/edit',
                isGptImageEdit: modelId === 'fal-ai/gpt-image-1/edit-image/byok',
                isFluxImageToImage: modelId === 'fal-ai/flux/dev/image-to-image',
                hasImageUrl: !!input.image_url,
                hasImageUrls: !!input.image_urls,
                hasOpenAIKey: !!input.openai_api_key,
                inputKeys: Object.keys(input),
                fullInput: JSON.stringify(input, null, 2),
            });

            // Configure credentials (must be done here to avoid client-side access)
            fal.config({
                credentials: env.FAL_API_KEY,
            });

            // Determinar modo de operação ANTES de submeter (evita cobrança dupla)
            // - Webhook: Produção/desenvolvimento com túnel (mais rápido, não bloqueia)
            // - Fallback: Apenas desenvolvimento sem túnel (mais lento, bloqueia)
            const useWebhook = !!process.env.NEXT_PUBLIC_APP_URL;
            const webhookUrl = useWebhook
                ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/fal`
                : undefined;

            console.log('🚀 Fal.ai submission mode:', {
                mode: useWebhook ? 'WEBHOOK (production/tunnel)' : 'FALLBACK (dev only)',
                webhookUrl: webhookUrl || 'N/A',
                hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
                appUrl: process.env.NEXT_PUBLIC_APP_URL,
            });

            let result: FalImageOutput;

            if (useWebhook) {
                // Modo webhook: salvar job ANTES de submeter para evitar race condition
                const user = await currentUser();
                if (!user) {
                    throw new Error('User not authenticated');
                }

                // Gerar um request_id temporário para salvar o job primeiro
                const tempRequestId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                console.log('Pre-creating job to avoid race condition...');

                // Extrair metadados do providerOptions
                const nodeId = providerOptions?.fal?.nodeId;
                const projectId = providerOptions?.fal?.projectId;

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

                console.log('Job pre-created with ID:', jobId);

                // Agora submeter para a fila
                const submission = await fal.queue.submit(modelId, {
                    input,
                    webhookUrl,
                });

                const request_id = submission.request_id;

                console.log('Fal.ai queue submitted:', { request_id, useWebhook });

                // Atualizar o job com o request_id real
                await database
                    .update(falJobs)
                    .set({ requestId: request_id })
                    .where(eq(falJobs.id, jobId));

                console.log('Job updated with real request_id, waiting for webhook...');

                // IMPORTANTE: Retornar um objeto que o AI SDK NÃO vai processar
                // Usamos um símbolo especial para indicar modo webhook
                const pendingResult = {
                    image: {
                        base64: '',
                        uint8Array: new Uint8Array(0),
                        mediaType: 'image/png' as const,
                    },
                    // Adicionar flag especial para indicar modo webhook
                    _webhookMode: true,
                    _requestId: request_id,
                } as any;

                console.log('✅ Returning webhook mode result:', {
                    requestId: request_id,
                    webhookMode: true,
                });

                return pendingResult;
            }

            // ⚠️ MODO FALLBACK (apenas desenvolvimento sem webhook)
            // Este modo bloqueia a requisição até completar (mais lento)
            // Use apenas quando NEXT_PUBLIC_APP_URL não estiver configurado
            console.log('⚠️ Using fallback polling mode (dev only, slower)');

            const { request_id: fallbackRequestId } = await fal.queue.submit(modelId, {
                input,
                // SEM webhookUrl - polling direto na API fal.ai
            });

            result = (await fal.queue.result(modelId, {
                requestId: fallbackRequestId,
            })).data as FalImageOutput;

            if (!result.images || result.images.length === 0) {
                throw new Error('No images generated');
            }

            const imageUrl = result.images[0].url;
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.arrayBuffer();

            const warnings: ImageModelCallWarning[] = result.has_nsfw_concepts?.[0]
                ? [{ type: 'other', message: 'NSFW content detected' }]
                : [];

            return {
                images: [new Uint8Array(imageBuffer)],
                warnings,
                response: {
                    timestamp: new Date(),
                    modelId,
                    headers: undefined,
                },
            };
        },
    }),
};
