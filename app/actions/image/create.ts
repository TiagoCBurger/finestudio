/**
 * Server Action para Criação de Imagem (Refatorado)
 * Usa provider factory e estrutura simplificada
 */

'use server';

import { getSubscribedUser } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { getProviderByModelId } from '@/lib/models/image/provider-factory';
import type { ImageGenerationResult } from '@/lib/models/image/types';

interface GenerateImageV2Params {
    prompt: string;
    images?: string[];
    modelId: string;
    instructions?: string;
    projectId: string;
    nodeId: string;
    size?: string;
}

/**
 * Gerar imagem usando provider apropriado
 */
export async function generateImageActionV2(
    params: GenerateImageV2Params
): Promise<ImageGenerationResult | { error: string }> {
    try {
        // Verificar autenticação
        const user = await getSubscribedUser();

        console.log('🎨 [GenerateImageV2] Starting generation:', {
            modelId: params.modelId,
            nodeId: params.nodeId,
            projectId: params.projectId,
            hasImages: !!params.images?.length,
            imageCount: params.images?.length ?? 0,
        });

        // Obter provider apropriado para o modelo
        const provider = getProviderByModelId(params.modelId);

        console.log('✅ [GenerateImageV2] Provider selected:', {
            providerName: (provider as any).providerName,
            modelId: params.modelId,
        });

        // Combinar prompt dos nós conectados com instruções do próprio nó
        const combinedPrompt = [params.prompt, params.instructions]
            .filter(Boolean)
            .join('\n\n')
            .trim();

        console.log('📝 [GenerateImageV2] Combined prompt:', {
            hasExternalPrompt: !!params.prompt,
            hasInstructions: !!params.instructions,
            combinedLength: combinedPrompt.length,
        });

        // Gerar imagem
        const result = await provider.generateImage({
            prompt: combinedPrompt,
            modelId: params.modelId,
            size: params.size,
            images: params.images,
            metadata: {
                nodeId: params.nodeId,
                projectId: params.projectId,
                userId: user.id,
            },
        });

        console.log('✅ [GenerateImageV2] Generation completed:', {
            status: result.state.status,
            hasJobId: 'jobId' in result.state,
        });

        return result;
    } catch (error) {
        const message = parseError(error);
        console.error('❌ [GenerateImageV2] Generation failed:', message);
        return { error: message };
    }
}
