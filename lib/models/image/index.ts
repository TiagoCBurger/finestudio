import {
  type TersaModel,
  type TersaProvider,
  providers,
} from '@/lib/providers';
import type { ImageModel } from 'ai';
import { falAI } from './fal';
import { kieAI } from './kie';
import { mockAI } from './mock';

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
  // 🧪 MOCK - Modelos de teste sem custo
  'mock-fast': {
    label: '🧪 Mock Fast (Teste Grátis)',
    chef: providers.mock,
    providers: [
      {
        ...providers.mock,
        model: mockAI.image('mock-fast'),
        getCost: () => 0, // Grátis!
      },
    ],
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
    priceIndicator: 'low',
    supportsEdit: false,
    default: false,
    enabled: true, // ✅ Ativo para testes
  },
  'mock-edit': {
    label: '🧪 Mock Edit (Teste Edição)',
    chef: providers.mock,
    providers: [
      {
        ...providers.mock,
        model: mockAI.image('mock-edit'),
        getCost: () => 0, // Grátis!
      },
    ],
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
    priceIndicator: 'low',
    supportsEdit: true,
    default: false,
    enabled: true, // ✅ Ativo para testes
  },
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
    default: false,
    enabled: true, // ✅ Ativo
  },
  'fal-flux-dev-image-to-image': {
    label: 'FLUX Dev Image-to-Image',
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
    default: true,
    enabled: true, // ✅ Ativo
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
    enabled: true, // ✅ Ativo
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
    enabled: true, // ✅ Ativo
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
    enabled: true, // ✅ Ativo
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
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
    priceIndicator: 'low',
    enabled: true, // ✅ Ativo
  },
};

/**
 * Retorna apenas os modelos de imagem que estão habilitados
 * Use esta função para filtrar modelos ativos na UI
 */
export const getEnabledImageModels = (): Record<string, TersaImageModel> => {
  try {
    // Verificações de segurança mais robustas
    if (!imageModels) {
      console.error('imageModels is null or undefined');
      return {};
    }

    if (typeof imageModels !== 'object') {
      console.error('imageModels is not an object:', typeof imageModels);
      return {};
    }

    // Debug: Log all models
    console.log('[getEnabledImageModels] Total models:', Object.keys(imageModels).length);
    console.log('[getEnabledImageModels] Model keys:', Object.keys(imageModels));

    // Verificar se Object.entries está disponível
    if (typeof Object.entries !== 'function') {
      console.error('Object.entries is not available');
      return {};
    }

    let entries;
    try {
      entries = Object.entries(imageModels);
    } catch (entriesError) {
      console.error('Error calling Object.entries:', entriesError);
      return {};
    }

    if (!Array.isArray(entries)) {
      console.error('Object.entries did not return an array:', entries);
      return {};
    }

    // Filtrar com verificações de segurança
    const filtered = entries.filter(([key, model]) => {
      if (!key || typeof key !== 'string') {
        console.warn('Invalid model key:', key);
        return false;
      }

      if (!model || typeof model !== 'object') {
        console.warn('Invalid model object for key:', key);
        return false;
      }

      // Modelo habilitado se enabled !== false (padrão é true)
      const isEnabled = model.enabled !== false;

      // Debug: Log each model's status
      if (key.includes('nano-banana')) {
        console.log(`[getEnabledImageModels] ${key}:`, {
          label: model.label,
          enabled: model.enabled,
          isEnabled,
        });
      }

      return isEnabled;
    });

    console.log('[getEnabledImageModels] Filtered models:', filtered.length);
    console.log('[getEnabledImageModels] Filtered keys:', filtered.map(([key]) => key));

    // Verificar se Object.fromEntries está disponível
    if (typeof Object.fromEntries !== 'function') {
      console.error('Object.fromEntries is not available');
      // Fallback manual
      const result: Record<string, TersaImageModel> = {};
      filtered.forEach(([key, model]) => {
        result[key] = model;
      });
      return result;
    }

    return Object.fromEntries(filtered);
  } catch (error) {
    console.error('Unexpected error in getEnabledImageModels:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return {};
  }
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
