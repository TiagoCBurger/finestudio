import {
  type TersaModel,
  type TersaProvider,
  providers,
} from '@/lib/providers';
import type { ImageModel } from 'ai';
import { falAI } from './fal';
import { kieAI } from './kie';

export type ImageSize = `${number}x${number}` | `${number}:${number}` | 'auto';

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
  providerOptions?: Record<string, Record<string, any>>; // Changed from string to any to support editModelId
  enabled?: boolean;
};

/**
 * Validates that a provider module is properly loaded
 * @throws Error if provider is invalid
 */
const validateProvider = (provider: unknown, name: string): void => {
  if (!provider || typeof (provider as any).image !== 'function') {
    console.error(`ERROR: ${name} is not properly imported!`, { provider });
    throw new Error(`${name} module failed to load`);
  }
};

// Validate all providers at module load time
validateProvider(falAI, 'falAI');
validateProvider(kieAI, 'kieAI');

// Standard image sizes supported by most models
const STANDARD_SIZES: ImageSize[] = ['1024x1024', '768x1024', '1024x768', '512x512'];

// KIE.ai Nano Banana aspect ratios (as per API documentation)
const KIE_ASPECT_RATIOS: ImageSize[] = [
  '1:1',
  '9:16',
  '16:9',
  '3:4',
  '4:3',
  '3:2',
  '2:3',
  '5:4',
  '4:5',
  '21:9',
  'auto',
];

export const imageModels: Record<string, TersaImageModel> = {
  // 🍌 NANO BANANA - Fast and economical image editing model
  'fal-nano-banana': {
    label: '🍌 Nano Banana (Fal)',
    chef: providers.fal,
    providers: [
      {
        ...providers.fal,
        model: falAI.image('fal-ai/nano-banana/edit'),
        // https://fal.ai/models/fal-ai/nano-banana/edit
        getCost: () => 2,
      },
    ],
    sizes: STANDARD_SIZES,
    priceIndicator: 'low',
    supportsEdit: true,
    default: false,
    enabled: true,
  },
  'fal-flux-dev-image-to-image': {
    label: 'FLUX Dev Image-to-Image',
    chef: providers.fal,
    providers: [
      {
        ...providers.fal,
        model: falAI.image('fal-ai/flux/dev/image-to-image'),
        // https://fal.ai/models/fal-ai/flux/dev/image-to-image
        getCost: () => 0.025,
      },
    ],
    sizes: STANDARD_SIZES,
    supportsEdit: true,
    default: true,
    enabled: true,
  },
  'fal-gpt-image-edit': {
    label: 'GPT Image Edit (BYOK)',
    chef: providers.fal,
    providers: [
      {
        ...providers.fal,
        model: falAI.image('fal-ai/gpt-image-1/edit-image/byok'),
        // https://fal.ai/models/fal-ai/gpt-image-1/edit-image/byok
        // BYOK model - requires user's OpenAI API key
        getCost: () => 0.02,
      },
    ],
    sizes: STANDARD_SIZES,
    supportsEdit: true,
    enabled: false, // Disabled - requires OpenAI verification
  },
  'fal-flux-pro-kontext': {
    label: 'FLUX Pro Kontext (Fal)',
    chef: providers.fal,
    providers: [
      {
        ...providers.fal,
        model: falAI.image('fal-ai/flux-pro/kontext'),
        // https://fal.ai/models
        getCost: () => 0.055,
      },
    ],
    sizes: STANDARD_SIZES,
    supportsEdit: false, // Apenas geração, não edição
    enabled: true,
  },
  'fal-flux-pro-kontext-max-multi': {
    label: 'FLUX Pro Kontext Max Multi (Fal)',
    chef: providers.fal,
    providers: [
      {
        ...providers.fal,
        model: falAI.image('fal-ai/flux-pro/kontext/max/multi'),
        // https://fal.ai/models
        getCost: () => 0.06,
      },
    ],
    sizes: STANDARD_SIZES,
    supportsEdit: false, // Apenas geração, não edição
    enabled: true,
  },
  'fal-ideogram-character': {
    label: 'Ideogram Character (Fal)',
    chef: providers.fal,
    providers: [
      {
        ...providers.fal,
        model: falAI.image('fal-ai/ideogram/character'),
        // https://fal.ai/models
        getCost: () => 0.08,
      },
    ],
    sizes: STANDARD_SIZES,
    supportsEdit: false, // Apenas geração, não edição
    enabled: true,
  },
  'kie-nano-banana': {
    label: '🍌 Nano Banana (Kie.ai)',
    chef: providers.kie,
    providers: [
      {
        ...providers.kie,
        model: kieAI.image('google/nano-banana'),
        getCost: () => 0.03,
      },
    ],
    sizes: KIE_ASPECT_RATIOS, // Use aspect ratios directly (1:1, 16:9, etc)
    priceIndicator: 'low',
    supportsEdit: true, // ✅ Suporta edição de imagem
    default: false,
    enabled: true,
    providerOptions: {
      kie: {
        editModelId: 'google/nano-banana-edit', // Usa modelo de edição quando há imagem
      },
    },
  },
  'kie-gpt-4o-image': {
    label: 'GPT-4o Image (Kie.ai)',
    chef: providers.kie,
    providers: [
      {
        ...providers.kie,
        model: kieAI.image('kie/gpt-4o-image'),
        getCost: () => 0.04, // Adjust based on actual pricing
      },
    ],
    sizes: ['1:1', '3:2', '2:3'], // As per API spec
    priceIndicator: 'low',
    supportsEdit: true, // Supports up to 5 reference images
    default: false,
    enabled: true,
  },
};

/**
 * Returns only enabled image models for UI display
 * Models are enabled by default unless explicitly disabled (enabled: false)
 * 
 * @returns Record of enabled image models with their configurations
 */
export const getEnabledImageModels = (): Record<string, TersaImageModel> => {
  const enabled = Object.fromEntries(
    Object.entries(imageModels).filter(([_, model]) => model.enabled !== false)
  );

  // Development-only logging (removed in production builds)
  if (process.env.NODE_ENV === 'development') {
    const nanoModels = Object.entries(enabled).filter(([key]) => key.includes('nano-banana'));
    if (nanoModels.length > 0) {
      console.log('[getEnabledImageModels] Nano-banana models:',
        nanoModels.map(([key, model]) => ({
          key,
          label: model.label,
          chef: model.chef?.id,
        }))
      );
    }
    console.log('[getEnabledImageModels] Total enabled:', Object.keys(enabled).length);
  }

  return enabled;
};

/**
 * Returns all image models including disabled ones
 * Use for administration or configuration purposes
 */
export const getAllImageModels = (): Record<string, TersaImageModel> => {
  return imageModels;
};
