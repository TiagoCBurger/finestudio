import {
  type TersaModel,
  type TersaProvider,
  providers,
} from '@/lib/providers';
import type { ImageModel } from 'ai';
import { falAI } from './fal';

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
  enabled?: boolean; // Flag para ativar/desativar modelo
};

// Debug: Check if falAI is properly imported
if (!falAI || typeof falAI.image !== 'function') {
  console.error('ERROR: falAI is not properly imported!', { falAI });
  throw new Error('falAI module failed to load');
}

export const imageModels: Record<string, TersaImageModel> = {
  // 🍌 NANO BANANA - Modelo de edição de imagem rápido e econômico
  'fal-nano-banana': {
    label: '🍌 Nano Banana',
    chef: providers.unknown,
    providers: [
      {
        ...providers.unknown,
        model: falAI.image('fal-ai/nano-banana/edit'),
        // https://fal.ai/models/fal-ai/nano-banana/edit
        getCost: () => 2, // Muito barato!
      },
    ],
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
    priceIndicator: 'low',
    supportsEdit: true,
    default: true,
    enabled: true, // ✅ Ativo
  },
  'fal-flux-dev-image-to-image': {
    label: 'FLUX Dev Image-to-Image (Fal)',
    chef: providers.fal,
    providers: [
      {
        ...providers.fal,
        model: falAI.image('fal-ai/flux/dev/image-to-image'),
        // https://fal.ai/models/fal-ai/flux/dev/image-to-image
        getCost: () => 0.025, // $0.025 per image
      },
    ],
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
    supportsEdit: true,
    enabled: false, // ✅ Ativo
  },
  'fal-gpt-image-edit': {
    label: 'GPT Image Edit (BYOK)',
    chef: providers.fal,
    providers: [
      {
        ...providers.fal,
        model: falAI.image('fal-ai/gpt-image-1/edit-image/byok'),
        // https://fal.ai/models/fal-ai/gpt-image-1/edit-image/byok
        // BYOK model - uses user's OpenAI API key
        getCost: () => 0.02, // Estimated cost per image
      },
    ],
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
    supportsEdit: true,
    enabled: false, // ❌ Desativado (requer verificação OpenAI)
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
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
    enabled: false, // ✅ Ativo
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
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
    enabled: false, // ✅ Ativo
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
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
    enabled: false, // ✅ Ativo
  },
};

/**
 * Retorna apenas os modelos de imagem que estão habilitados
 * Use esta função para filtrar modelos ativos na UI
 */
export const getEnabledImageModels = (): Record<string, TersaImageModel> => {
  if (!imageModels || typeof imageModels !== 'object') {
    console.error('imageModels is not properly initialized:', imageModels);
    return {};
  }
  return Object.fromEntries(
    Object.entries(imageModels).filter(([_, model]) => model.enabled !== false)
  );
};

/**
 * Retorna todos os modelos de imagem (incluindo desabilitados)
 * Use esta função para administração ou configuração
 */
export const getAllImageModels = (): Record<string, TersaImageModel> => {
  if (!imageModels || typeof imageModels !== 'object') {
    console.error('imageModels is not properly initialized:', imageModels);
    return {};
  }
  return imageModels;
};
