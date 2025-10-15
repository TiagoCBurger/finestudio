import { env } from '@/lib/env';
import type { VideoModel } from '@/lib/models/video';

type FalVideoModel =
    | 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video'
    | 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video'
    | 'fal-ai/sora-2/image-to-video/pro';

export const fal = (
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

        const headers: Record<string, string> = {
            Authorization: `Key ${env.FAL_API_KEY}`,
            'Content-Type': 'application/json',
        };

        console.log('Fal.ai video request:', {
            modelId,
            hasImage: !!imagePrompt,
            requestedDuration: duration,
            adjustedDuration,
            aspectRatio,
        });

        // Requisição inicial (assíncrona)
        const response = await fetch(`https://fal.run/${modelId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Fal.ai video request failed:', {
                status: response.status,
                error,
                modelId,
            });
            throw new Error(`Failed to generate video: ${error}`);
        }

        const result = await response.json();

        // Fal.ai pode retornar diretamente ou com request_id para polling
        if (result.video?.url) {
            return result.video.url;
        }

        const requestId = result.request_id;
        if (!requestId) {
            throw new Error('Fal.ai did not return a request ID or video URL');
        }

        // Polling para aguardar conclusão
        // Sora 2 pode levar até 6 minutos, Kling é mais rápido (3 minutos)
        const maxPollTime = modelId.includes('sora')
            ? 6 * 60 * 1000
            : 3 * 60 * 1000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxPollTime) {
            const statusResponse = await fetch(
                `https://fal.run/${modelId}/requests/${requestId}`,
                { headers }
            );

            if (!statusResponse.ok) {
                throw new Error(
                    `Failed to check video status: ${statusResponse.statusText}`
                );
            }

            const status = await statusResponse.json();

            if (status.status === 'completed' && status.video?.url) {
                return status.video.url;
            }

            if (status.status === 'failed') {
                throw new Error(
                    `Video generation failed: ${status.error || 'unknown error'}`
                );
            }

            // Aguardar 3 segundos antes de próxima verificação
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        throw new Error('Video generation timed out');
    },
});
