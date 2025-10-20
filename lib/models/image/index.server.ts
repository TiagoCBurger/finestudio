import {
    type TersaModel,
    type TersaProvider,
    providers,
} from '@/lib/providers';
import type { PriceBracket } from '@/providers/gateway/client';
import type { ImageModel } from 'ai';
import { falAIServer } from './fal.server';
import { kieAIServer } from './kie.server';

/**
 * Image size format: width x height in pixels
 * @example '1024x1024', '768x1024'
 */
export type ImageSize = `${number}x${number}`;

/**
 * Cost calculation parameters for image generation
 */
export interface CostCalculationParams {
    textInput?: number;
    imageInput?: number;
    output?: number;
    size?: string;
}

/**
 * Extended Tersa model with image-specific properties
 */
type TersaImageModel = TersaModel & {
    providers: (TersaProvider & {
        model: ImageModel;
        /**
         * Calculate cost in credits for this model
         * @param props - Optional parameters affecting cost calculation
         * @returns Cost in credits
         */
        getCost: (props?: CostCalculationParams) => number;
    })[];
    sizes?: ImageSize[];
    supportsEdit?: boolean;
    providerOptions?: Record<string, Record<string, string>>;
    enabled?: boolean;
};

/**
 * Standard image sizes supported by most models
 */
const STANDARD_IMAGE_SIZES: ImageSize[] = ['1024x1024', '768x1024', '1024x768', '512x512'];

/**
 * Helper to create a Fal AI image model configuration
 */
function createFalImageModel(
    modelId: Parameters<typeof falAIServer.image>[0],
    config: {
        label: string;
        cost: number;
        supportsEdit?: boolean;
        enabled?: boolean;
        priceIndicator?: PriceBracket;
        isDefault?: boolean;
        sizes?: ImageSize[];
    }
): TersaImageModel {
    const model: TersaImageModel = {
        label: config.label,
        chef: providers.fal,
        providers: [
            {
                ...providers.fal,
                model: falAIServer.image(modelId),
                getCost: () => config.cost,
            },
        ],
        sizes: config.sizes ?? STANDARD_IMAGE_SIZES,
        supportsEdit: config.supportsEdit ?? false,
        enabled: config.enabled ?? true,
    };

    if (config.priceIndicator) {
        model.priceIndicator = config.priceIndicator;
    }

    if (config.isDefault) {
        model.default = true;
    }

    return model;
}

/**
 * Helper to create a Kie AI image model configuration
 */
function createKieImageModel(
    modelId: Parameters<typeof kieAIServer.image>[0],
    config: {
        label: string;
        cost: number;
        enabled?: boolean;
        priceIndicator?: PriceBracket;
        sizes?: ImageSize[];
    }
): TersaImageModel {
    const model: TersaImageModel = {
        label: config.label,
        chef: providers.kie,
        providers: [
            {
                ...providers.kie,
                model: kieAIServer.image(modelId),
                getCost: () => config.cost,
            },
        ],
        sizes: config.sizes ?? STANDARD_IMAGE_SIZES,
        enabled: config.enabled ?? true,
    };

    if (config.priceIndicator) {
        model.priceIndicator = config.priceIndicator;
    }

    return model;
}

/**
 * Server-side image model configurations
 * 
 * Each model includes:
 * - Provider configuration (Fal AI, Kie AI, etc.)
 * - Cost calculation (in credits)
 * - Supported image sizes
 * - Edit capabilities
 * - Enabled/disabled state
 * 
 * @example
 * ```typescript
 * const model = imageModelsServer['fal-nano-banana'];
 * const cost = model.providers[0].getCost();
 * ```
 */
export const imageModelsServer: Record<string, TersaImageModel> = {
    'fal-nano-banana': createFalImageModel('fal-ai/nano-banana/edit', {
        label: '🍌 Nano Banana',
        cost: 2,
        supportsEdit: true,
        priceIndicator: 'low',
        isDefault: true,
    }),

    'fal-flux-dev-image-to-image': createFalImageModel('fal-ai/flux/dev/image-to-image', {
        label: 'FLUX Dev Image-to-Image (Fal)',
        cost: 0.025,
        supportsEdit: true,
    }),

    'fal-gpt-image-edit': createFalImageModel('fal-ai/gpt-image-1/edit-image/byok', {
        label: 'GPT Image Edit (BYOK)',
        cost: 0.02,
        supportsEdit: true,
        enabled: false,
    }),

    'fal-flux-pro-kontext': createFalImageModel('fal-ai/flux-pro/kontext', {
        label: 'FLUX Pro Kontext (Fal)',
        cost: 0.055,
    }),

    'fal-flux-pro-kontext-max-multi': createFalImageModel('fal-ai/flux-pro/kontext/max/multi', {
        label: 'FLUX Pro Kontext Max Multi (Fal)',
        cost: 0.06,
    }),

    'fal-ideogram-character': createFalImageModel('fal-ai/ideogram/character', {
        label: 'Ideogram Character (Fal)',
        cost: 0.08,
    }),

    'kie-nano-banana': createKieImageModel('google/nano-banana', {
        label: '🍌 Nano Banana (Kie.ai)',
        cost: 0.03,
        priceIndicator: 'low',
    }),
};
