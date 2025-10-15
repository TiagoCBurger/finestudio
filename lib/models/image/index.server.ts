import {
    type TersaModel,
    type TersaProvider,
    providers,
} from '@/lib/providers';
import type { ImageModel } from 'ai';
import { falAIServer } from './fal.server';

export type ImageSize = `${number}x${number}`;

type TersaImageModel = TersaModel & {
    providers: (TersaProvider & {
        model: ImageModel;
        getCost: (props?: {
            textInput?: number;
            imageInput?: number;
            output?: number;
            size?: string;
        }) => number;
    })[];
    sizes?: ImageSize[];
    supportsEdit?: boolean;
    providerOptions?: Record<string, Record<string, string>>;
    enabled?: boolean;
};

export const imageModelsServer: Record<string, TersaImageModel> = {
    'fal-nano-banana': {
        label: '🍌 Nano Banana',
        chef: providers.unknown,
        providers: [
            {
                ...providers.unknown,
                model: falAIServer.image('fal-ai/nano-banana/edit'),
                getCost: () => 2,
            },
        ],
        sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
        priceIndicator: 'low',
        supportsEdit: true,
        default: true,
        enabled: true,
    },
    'fal-flux-dev-image-to-image': {
        label: 'FLUX Dev Image-to-Image (Fal)',
        chef: providers.fal,
        providers: [
            {
                ...providers.fal,
                model: falAIServer.image('fal-ai/flux/dev/image-to-image'),
                getCost: () => 0.025,
            },
        ],
        sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
        supportsEdit: true,
        enabled: false,
    },
    'fal-gpt-image-edit': {
        label: 'GPT Image Edit (BYOK)',
        chef: providers.fal,
        providers: [
            {
                ...providers.fal,
                model: falAIServer.image('fal-ai/gpt-image-1/edit-image/byok'),
                getCost: () => 0.02,
            },
        ],
        sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
        supportsEdit: true,
        enabled: false,
    },
    'fal-flux-pro-kontext': {
        label: 'FLUX Pro Kontext (Fal)',
        chef: providers.fal,
        providers: [
            {
                ...providers.fal,
                model: falAIServer.image('fal-ai/flux-pro/kontext'),
                getCost: () => 0.055,
            },
        ],
        sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
        enabled: false,
    },
    'fal-flux-pro-kontext-max-multi': {
        label: 'FLUX Pro Kontext Max Multi (Fal)',
        chef: providers.fal,
        providers: [
            {
                ...providers.fal,
                model: falAIServer.image('fal-ai/flux-pro/kontext/max/multi'),
                getCost: () => 0.06,
            },
        ],
        sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
        enabled: false,
    },
    'fal-ideogram-character': {
        label: 'Ideogram Character (Fal)',
        chef: providers.fal,
        providers: [
            {
                ...providers.fal,
                model: falAIServer.image('fal-ai/ideogram/character'),
                getCost: () => 0.08,
            },
        ],
        sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
        enabled: false,
    },
};
