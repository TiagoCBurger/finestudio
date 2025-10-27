/**
 * KIE.ai Video Provider
 * Implements video generation using KIE.ai API
 * Focused on Kling v2-5-turbo-image-to-video-pro model
 */

import { env } from '@/lib/env';
import type { VideoModel } from '@/lib/models/video';
import { currentUser } from '@/lib/auth';
import { createFalJob } from '@/lib/fal-jobs';

type KieVideoModel =
    | 'kling/v2-5-turbo-image-to-video-pro'
    | 'kling/v2-5-turbo-text-to-video-pro';

/**
 * KIE API Response
 */
interface KieApiResponse {
    code: number;
    msg: string;
    data?: {
        taskId?: string;
    };
}

/**
 * KIE API Input for image-to-video
 */
interface KieImageToVideoInput {
    prompt: string;
    image_url: string;
    duration?: string;
    negative_prompt?: string;
    cfg_scale?: number;
}

/**
 * KIE API Input for text-to-video
 */
interface KieTextToVideoInput {
    prompt: string;
    duration?: string;
    aspect_ratio?: string;
    negative_prompt?: string;
    cfg_scale?: number;
}

type KieVideoInput = KieImageToVideoInput | KieTextToVideoInput;

export const kieServer = (
    imageToVideoModelId: KieVideoModel,
    textToVideoModelId?: KieVideoModel
): VideoModel => ({
    modelId: imageToVideoModelId,
    textToVideoModelId,
    generate: async ({ prompt, imagePrompt, duration, aspectRatio, _metadata, negativePrompt, cfgScale }) => {
        // Escolher o endpoint correto baseado na presença de imagem
        const modelId = imagePrompt
            ? imageToVideoModelId  // Se tem imagem, usa image-to-video
            : textToVideoModelId || imageToVideoModelId;  // Se não tem imagem, usa text-to-video (se disponível)

        // Validação: se não tem textToVideoModelId, imagem é obrigatória
        if (!imagePrompt && !textToVideoModelId) {
            throw new Error(`${modelId} requires an image input (image-to-video)`);
        }

        console.log('🎬 KIE.ai video generation:', {
            modelId,
            hasImage: !!imagePrompt,
            mode: imagePrompt ? 'image-to-video' : 'text-to-video',
            imageUrl: imagePrompt?.substring(0, 100),
            duration,
            aspectRatio,
            negativePrompt,
            cfgScale,
        });

        // Preparar input base para API KIE
        const baseInput = {
            prompt,
            duration: duration.toString(), // "5" ou "10"
            negative_prompt: negativePrompt || 'blur, distort, and low quality',
            cfg_scale: cfgScale !== undefined ? cfgScale : 0.5,
        };

        let input: KieVideoInput;

        // Adicionar image_url apenas se houver imagem válida (image-to-video)
        if (imagePrompt && typeof imagePrompt === 'string' && imagePrompt.trim() !== '') {
            // Validar formato básico da URL
            if (!imagePrompt.startsWith('http://') && !imagePrompt.startsWith('https://')) {
                throw new Error(`Invalid image URL format: must start with http:// or https://`);
            }

            // Log detalhado da URL para debug
            const urlParts = new URL(imagePrompt);
            const hasValidExtension = /\.(jpg|jpeg|png|webp)$/i.test(urlParts.pathname);

            console.log('🔍 Image URL analysis:', {
                protocol: urlParts.protocol,
                hostname: urlParts.hostname,
                pathname: urlParts.pathname,
                hasExtension: hasValidExtension,
                fullUrl: imagePrompt,
            });

            if (!hasValidExtension) {
                console.warn('⚠️ WARNING: Image URL does not have a visible file extension (.jpg, .png, .webp)');
                console.warn('⚠️ This may cause "image_url file type not supported" error from KIE API');
                console.warn('⚠️ URL:', imagePrompt);
            }

            input = {
                ...baseInput,
                image_url: imagePrompt,
            } as KieImageToVideoInput;

            console.log('✅ Image URL added to input (image-to-video mode)');
        } else {
            // Text-to-video mode (sem image_url, mas com aspect_ratio)
            input = {
                ...baseInput,
                aspect_ratio: aspectRatio || '16:9',
            } as KieTextToVideoInput;
            console.log('ℹ️ No image URL provided, using text-to-video mode with aspect_ratio:', aspectRatio);
        }

        console.log('📤 KIE.ai video request:', {
            modelId,
            inputKeys: Object.keys(input),
            duration: input.duration,
            imageUrl: 'image_url' in input ? input.image_url : undefined,
            prompt: input.prompt.substring(0, 100),
        });

        // Determinar modo de operação
        const useWebhook = !!process.env.NEXT_PUBLIC_APP_URL;
        const webhookUrl = useWebhook
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie`
            : undefined;

        console.log('KIE.ai video submission mode:', {
            mode: useWebhook ? 'WEBHOOK (production/tunnel)' : 'FALLBACK (polling)',
            webhookUrl: webhookUrl || 'N/A',
        });

        // Submeter para API KIE (seguindo exatamente a documentação)
        const requestBody: {
            model: string;
            input: KieVideoInput;
            callBackUrl?: string;
        } = {
            model: modelId,
            input,
        };

        // Adicionar callBackUrl apenas se definido
        if (webhookUrl) {
            requestBody.callBackUrl = webhookUrl;
        }

        console.log('📡 Sending request to KIE.ai:', {
            url: 'https://api.kie.ai/api/v1/jobs/createTask',
            model: requestBody.model,
            hasCallbackUrl: !!requestBody.callBackUrl,
            inputKeys: Object.keys(requestBody.input),
            fullRequestBody: JSON.stringify(requestBody, null, 2),
        });

        const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.KIE_API_KEY}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ KIE.ai API HTTP error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
                requestBody: JSON.stringify(requestBody, null, 2),
            });
            throw new Error(`KIE.ai API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = (await response.json()) as KieApiResponse;

        console.log('📥 KIE.ai API response:', {
            code: data.code,
            msg: data.msg,
            hasTaskId: !!data.data?.taskId,
            fullResponse: JSON.stringify(data, null, 2),
        });

        if (data.code !== 200 || !data.data?.taskId) {
            console.error('❌ KIE.ai API returned error:', {
                code: data.code,
                msg: data.msg,
                data: data.data,
                fullResponse: JSON.stringify(data, null, 2),
            });
            throw new Error(`KIE.ai API error: ${data.msg || 'Unknown error'}`);
        }

        const taskId = data.data.taskId;
        console.log('✅ KIE.ai video task created:', { taskId });

        if (useWebhook) {
            // Modo webhook: salvar job e retornar imediatamente
            const user = await currentUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            await createFalJob({
                requestId: taskId,
                userId: user.id,
                modelId,
                type: 'video',
                input: {
                    ...input,
                    _metadata,
                },
            });

            console.log('✅ Video job saved, returning immediately (webhook will update)');
            return `pending:${taskId}`;
        } else {
            // Modo fallback: polling
            console.log('⚠️ Using fallback polling mode for video (dev only)');
            return await pollKieTask(taskId);
        }
    },
});

/**
 * Poll KIE task status until completion
 */
async function pollKieTask(taskId: string): Promise<string> {
    const maxAttempts = 120; // 10 minutes (5s interval)
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await fetch(
            `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`,
            {
                headers: {
                    Authorization: `Bearer ${env.KIE_API_KEY}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to poll KIE task: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.data?.state === 'success') {
            const resultJson = JSON.parse(data.data.resultJson);
            const videoUrl = resultJson.resultUrls?.[0];

            if (!videoUrl) {
                throw new Error('No video URL in KIE response');
            }

            console.log('✅ KIE.ai video completed:', { videoUrl });
            return videoUrl;
        }

        if (data.data?.state === 'fail') {
            throw new Error(`KIE task failed: ${data.data.failMsg || 'Unknown error'}`);
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('KIE task timeout');
}
