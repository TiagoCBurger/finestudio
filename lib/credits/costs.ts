// Custos em créditos por modelo
export const MODEL_COSTS = {
    // Modelos de Imagem
    'fal-ai/nano-banana/edit': 1,

    // Modelos de Texto
    'openai-gpt-4': 8,
    'openai-gpt-3.5-turbo': 3,
    'anthropic-claude-3': 6,

    // Modelos de Áudio
    'openai-tts-1': 4,
    'openai-whisper-1': 3,

    // Modelos de Vídeo
    'runway-gen3': 20,
    'luma-dream-machine': 15,
} as const;

export type ModelId = keyof typeof MODEL_COSTS;

export const getModelCost = (modelId: string): number => {
    return MODEL_COSTS[modelId as ModelId] || 1; // Default 1 crédito
};

// Custos especiais baseados em parâmetros
export const calculateDynamicCost = (
    modelId: string,
    params?: {
        resolution?: string;
        duration?: number;
        quality?: string;
    }
): number => {
    let baseCost = getModelCost(modelId);

    // Multiplicadores por resolução
    if (params?.resolution) {
        const resolutionMultipliers: Record<string, number> = {
            '512x512': 1,
            '1024x1024': 2,
            '1536x1536': 4,
            '2048x2048': 8,
        };
        baseCost *= resolutionMultipliers[params.resolution] || 1;
    }

    // Multiplicadores por duração (vídeo/áudio)
    if (params?.duration) {
        baseCost *= Math.ceil(params.duration / 10); // +1 crédito a cada 10s
    }

    // Multiplicadores por qualidade
    if (params?.quality === 'hd') {
        baseCost *= 2;
    }

    return Math.max(1, baseCost); // Mínimo 1 crédito
};