import type { ImageModel } from 'ai';

/**
 * Mock Image Provider - Para testes sem gastar créditos
 * 
 * Este provider simula a geração de imagens retornando URLs de placeholders
 * ou imagens de teste. Útil para desenvolvimento e testes.
 */

export const mockAI = {
    image: (modelId: string): ImageModel => {
        return {
            modelId,
            provider: 'mock',

            async doGenerate(options) {
                console.log('[MOCK] Gerando imagem com opções:', {
                    prompt: options.prompt,
                    size: options.size,
                    n: options.n,
                });

                // Simula um delay de API real (500ms-2s)
                const delay = Math.random() * 1500 + 500;
                await new Promise(resolve => setTimeout(resolve, delay));

                // Gera URLs de placeholder baseadas no prompt
                const images = Array.from({ length: options.n || 1 }, (_, i) => {
                    // Usa picsum.photos para imagens aleatórias reais
                    const [width, height] = (options.size || '1024x1024').split('x').map(Number);
                    const seed = Math.random().toString(36).substring(7);

                    return {
                        url: `https://picsum.photos/seed/${seed}/${width}/${height}`,
                        // Alternativa com placeholder.com:
                        // url: `https://via.placeholder.com/${width}x${height}/4A90E2/FFFFFF?text=Mock+Image+${i + 1}`,
                    };
                });

                console.log('[MOCK] Imagens geradas:', images);

                // Converter para formato esperado (array de strings)
                const imageUrls = images.map(img => img.url);

                return {
                    images: imageUrls,
                    warnings: [],
                    response: {
                        id: `mock-${Date.now()}`,
                        timestamp: new Date(),
                        modelId,
                        headers: undefined,
                    },
                };
            },
        };
    },
};
