/**
 * KIE.ai Image Provider (Refatorado)
 * Implementa geração de imagem usando API do KIE.ai
 * Focado nos modelos Nano Banana e Nano Banana Edit
 */

import { env } from '@/lib/env';
import { ImageProviderBase } from './provider-base';
import type { ImageGenerationInput } from './types';

/**
 * Máximo de imagens suportadas pelo KIE.ai
 */
const MAX_KIE_IMAGES = 10;

/**
 * Modelos KIE.ai suportados
 */
const KIE_MODELS = {
    NANO_BANANA: 'google/nano-banana',
    NANO_BANANA_EDIT: 'google/nano-banana-edit',
} as const;

/**
 * Resposta da API KIE.ai
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
 * Input para API KIE.ai
 */
interface KieApiInput {
    prompt: string;
    output_format: 'png' | 'jpeg' | 'webp';
    image_size: string;
    image_urls?: string[];
}

/**
 * Provider para KIE.ai
 */
export class KieImageProvider extends ImageProviderBase {
    protected get providerName(): string {
        return 'KIE';
    }

    /**
     * Submeter job para API KIE.ai
     */
    protected async submitToExternalAPI(
        input: ImageGenerationInput
    ): Promise<{ requestId: string; tempJobId?: string }> {
        // Converter model ID se necessário (kie-nano-banana → google/nano-banana)
        const apiModelId = this.convertModelId(input.modelId);

        // Preparar input para API
        const apiInput = this.prepareApiInput(input);

        console.log('🔍 [KIE] API input prepared:', {
            originalModelId: input.modelId,
            apiModelId,
            hasImages: !!apiInput.image_urls?.length,
            imageCount: apiInput.image_urls?.length ?? 0,
            imageSize: apiInput.image_size,
        });

        // Submeter para API
        const response = await this.callKieApi(apiModelId, apiInput);

        // Extrair request ID
        const requestId = this.extractRequestId(response);

        if (!requestId) {
            console.error('❌ [KIE] No request ID in response:', response);
            throw new Error(
                'KIE.ai API did not return a valid request ID. ' +
                'Expected one of: data.taskId, data.recordId, data.id, taskId, recordId, id'
            );
        }

        console.log('✅ [KIE] Job submitted successfully:', { requestId });

        return { requestId };
    }

    /**
     * Converter model ID para formato da API KIE
     * kie-nano-banana → google/nano-banana
     * kie-nano-banana-edit → google/nano-banana-edit
     */
    private convertModelId(modelId: string): string {
        // Se já está no formato correto, retorna
        if (modelId.startsWith('google/')) {
            return modelId;
        }

        // Converter kie-* para google/*
        if (modelId.startsWith('kie-')) {
            const modelName = modelId.replace('kie-', '');
            return `google/${modelName}`;
        }

        // Fallback: retorna como está
        return modelId;
    }

    /**
     * Preparar input para API KIE.ai
     */
    private prepareApiInput(input: ImageGenerationInput): KieApiInput {
        const apiInput: KieApiInput = {
            prompt: input.prompt,
            output_format: 'png',
            image_size: input.size || '1:1', // KIE usa aspect ratio (1:1, 16:9, etc)
        };

        // Adicionar imagens se fornecidas
        if (input.images && input.images.length > 0) {
            const isEditModel = input.modelId.includes('-edit');

            console.log(`🖼️ [KIE] Adding ${input.images.length} image(s) to ${isEditModel ? 'edit' : 'generation'} request`);

            // Limitar a MAX_KIE_IMAGES
            apiInput.image_urls = input.images.slice(0, MAX_KIE_IMAGES);

            if (input.images.length > MAX_KIE_IMAGES) {
                console.warn(
                    `⚠️ [KIE] Max ${MAX_KIE_IMAGES} images supported. ${input.images.length - MAX_KIE_IMAGES} image(s) ignored.`
                );
            }
        }

        return apiInput;
    }

    /**
     * Chamar API KIE.ai
     */
    private async callKieApi(
        modelId: string,
        input: KieApiInput
    ): Promise<KieApiResponse> {
        const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.KIE_API_KEY}`,
            },
            body: JSON.stringify({
                model: modelId,
                callBackUrl: this.config.webhookUrl,
                input,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [KIE] API error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
            });
            throw new Error(`KIE.ai API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as KieApiResponse;

        console.log('📥 [KIE] API response:', {
            hasData: !!data.data,
            dataKeys: data.data ? Object.keys(data.data) : [],
            topLevelKeys: Object.keys(data),
        });

        return data;
    }

    /**
     * Extrair request ID da resposta
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

/**
 * Factory function para criar provider KIE
 */
export function createKieImageProvider(webhookUrl?: string): KieImageProvider {
    if (!env.KIE_API_KEY) {
        throw new Error('KIE_API_KEY is not configured');
    }

    return new KieImageProvider({
        apiKey: env.KIE_API_KEY,
        webhookUrl,
    });
}
