import type { ImageModel } from 'ai';

const models = [
    'google/nano-banana',
    'google/nano-banana-edit',
] as const;

type KieModel = (typeof models)[number];

type KieImageOutput = {
    images: Array<{
        url: string;
        width: number;
        height: number;
        content_type: string;
    }>;
    seed?: number;
    prompt: string;
};

export const kieAI = {
    image: (modelId: KieModel): ImageModel => ({
        modelId,
        provider: 'kie',
        specificationVersion: 'v2',
        maxImagesPerCall: 1,
        doGenerate: async () => {
            throw new Error('Image generation must be called from server-side code');
        },
    }),
};