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

        // Determinar o modelo correto baseado em imagens conectadas
        let effectiveModelId = params.modelId;

        // Se há imagens conectadas, verificar se deve usar modelo de edição
        if (params.images && params.images.length > 0) {
            // Importar modelos para verificar configuração
            const { imageModels } = await import('@/lib/models/image');
            const modelConfig = imageModels[params.modelId];

            console.log('🔍 [GenerateImageV2] Model configuration check:', {
                modelId: params.modelId,
                hasConfig: !!modelConfig,
                supportsEdit: modelConfig?.supportsEdit,
                hasProviderOptions: !!modelConfig?.providerOptions,
                providerOptionsKeys: modelConfig?.providerOptions ? Object.keys(modelConfig.providerOptions) : [],
                kieOptions: modelConfig?.providerOptions?.kie,
                images: params.images,
                imageCount: params.images.length,
            });

            if (modelConfig?.supportsEdit && modelConfig.providerOptions?.kie?.editModelId) {
                const editModelId = modelConfig.providerOptions.kie.editModelId as string;
                console.log('🔄 [GenerateImageV2] Switching to edit model:', {
                    originalModel: params.modelId,
                    editModel: editModelId,
                    imageCount: params.images.length,
                    images: params.images,
                });
                effectiveModelId = editModelId;
            } else {
                console.log('⚠️ [GenerateImageV2] No edit model configured, using original model:', {
                    modelId: params.modelId,
                    supportsEdit: modelConfig?.supportsEdit,
                    hasProviderOptions: !!modelConfig?.providerOptions,
                    kieEditModelId: modelConfig?.providerOptions?.kie?.editModelId,
                });
            }
        } else {
            console.log('ℹ️ [GenerateImageV2] No images provided, using text-to-image model:', {
                modelId: params.modelId,
                hasImages: !!params.images,
                imageCount: params.images?.length ?? 0,
            });
        }

        // Obter provider apropriado para o modelo
        const provider = getProviderByModelId(effectiveModelId);

        console.log('✅ [GenerateImageV2] Provider selected:', {
            providerName: (provider as any).providerName,
            originalModelId: params.modelId,
            effectiveModelId,
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
            modelId: effectiveModelId,
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
