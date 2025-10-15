import { fal as falClient } from '@fal-ai/client';
import { env } from '@/lib/env';
import type { VideoModel } from '@/lib/models/video';
import { currentUser } from '@/lib/auth';
import { createFalJob, waitForFalJob } from '@/lib/fal-jobs';

type FalVideoModel =
    | 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video'
    | 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video'
    | 'fal-ai/sora-2/image-to-video/pro';

export const falServer = (
    imageToVideoModelId: FalVideoModel,
    textToVideoModelId?: FalVideoModel
): VideoModel => ({
    modelId: imageToVideoModelId,
    textToVideoModelId,
    generate: async ({ prompt, imagePrompt, duration, aspectRatio }) => {
        // Escolher o endpoint correto baseado na presença de imagem
        const modelId = imagePrompt && textToVideoModelId
            ? imageToVideoModelId
            : !imagePrompt && textToVideoModelId
                ? textToVideoModelId
                : imageToVideoModelId;

        // Validação: se não tem textToVideoModelId, imagem é obrigatória
        if (!imagePrompt && !textToVideoModelId) {
            throw new Error(`${modelId} requires an image input (image-to-video)`);
        }

        console.log('Fal.ai video mode:', {
            hasImage: !!imagePrompt,
            selectedEndpoint: modelId,
            mode: imagePrompt ? 'image-to-video' : 'text-to-video'
        });

        // Ajustar duração baseada no modelo
        // Sora 2: aceita apenas 4, 8, ou 12 segundos
        // Kling: aceita 5 ou 10 segundos
        let adjustedDuration = duration;
        if (modelId.includes('sora')) {
            // Para Sora 2, mapear 5 -> 4 (mais próximo)
            adjustedDuration = duration <= 5 ? 4 : duration <= 8 ? 8 : 12;
            if (adjustedDuration !== duration) {
                console.log(`Sora 2: Ajustando duração de ${duration}s para ${adjustedDuration}s (valores aceitos: 4, 8, 12)`);
            }
        }

        const input: Record<string, unknown> = {
            prompt,
            duration: adjustedDuration,
            aspect_ratio: aspectRatio, // "16:9", "9:16", "1:1"
        };

        // Adicionar image_url apenas se houver imagem
        if (imagePrompt) {
            input.image_url = imagePrompt;
        }

        console.log('Fal.ai video queue request:', {
            modelId,
            hasImage: !!imagePrompt,
            requestedDuration: duration,
            adjustedDuration,
            aspectRatio,
        });

        // Configure credentials (must be done here to avoid client-side access)
        falClient.config({
            credentials: env.FAL_API_KEY,
        });

        // Determinar modo de operação ANTES de submeter (evita cobrança dupla)
        // - Webhook: Produção/desenvolvimento com túnel (mais rápido, não bloqueia)
        // - Fallback: Apenas desenvolvimento sem túnel (mais lento, bloqueia)
        const useWebhook = !!process.env.NEXT_PUBLIC_APP_URL;
        const webhookUrl = useWebhook
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/fal`
            : undefined;

        console.log('Fal.ai video submission mode:', {
            mode: useWebhook ? 'WEBHOOK (production/tunnel)' : 'FALLBACK (dev only)',
            webhookUrl: webhookUrl || 'N/A',
        });

        // Submeter para a fila com ou sem webhook
        const { request_id } = await falClient.queue.submit(modelId, {
            input,
            ...(webhookUrl && { webhookUrl }),
        });

        console.log('Fal.ai video queue submitted:', { request_id, useWebhook });

        let result: { video: { url: string } };

        if (useWebhook) {
            // Modo webhook: salvar job e aguardar via polling no banco
            const user = await currentUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            await createFalJob({
                requestId: request_id,
                userId: user.id,
                modelId,
                type: 'video',
                input,
            });

            console.log('Video job saved, waiting for webhook...');

            // Sora 2 pode levar até 6 minutos, Kling é mais rápido (3 minutos)
            const maxWaitTime = modelId.includes('sora')
                ? 6 * 60 * 1000
                : 3 * 60 * 1000;

            const job = await waitForFalJob(request_id, {
                maxWaitTime,
                pollInterval: 3000, // 3 segundos para vídeos
            });

            result = job.result as { video: { url: string } };
        } else {
            // ⚠️ MODO FALLBACK (apenas desenvolvimento sem webhook)
            // Este modo bloqueia a requisição até completar (pode levar minutos)
            // Use apenas quando NEXT_PUBLIC_APP_URL não estiver configurado
            console.log('⚠️ Using fallback polling mode for video (dev only, slower)');

            const timeoutMs = modelId.includes('sora')
                ? 6 * 60 * 1000
                : 3 * 60 * 1000;

            result = (await falClient.queue.result(modelId, {
                requestId: request_id,
            })).data as { video: { url: string } };
        }

        if (!result.video?.url) {
            throw new Error('No video URL returned from fal.ai');
        }

        return result.video.url;
    },
});
