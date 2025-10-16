import {
  type TersaModel,
  type TersaProvider,
  providers,
} from '@/lib/providers';
import { fal } from './fal';

export type VideoModel = {
  modelId: string;
  textToVideoModelId?: string; // Endpoint alternativo para text-to-video
  generate: (props: {
    prompt: string;
    imagePrompt: string | undefined;
    duration: number;
    aspectRatio: string;
  }) => Promise<string>;
};

export type TersaVideoModel = TersaModel & {
  providers: (TersaProvider & {
    model: VideoModel;
    getCost: ({ duration }: { duration: number }) => number;
  })[];
  enabled?: boolean;
  durations?: number[]; // Durações disponíveis em segundos
  aspectRatios?: string[]; // Aspect ratios disponíveis
};

export const videoModels: Record<string, TersaVideoModel> = {
  'fal-kling-v2.5-turbo-pro': {
    label: 'Kling Video v2.5 Turbo Pro',
    chef: providers.fal,
    providers: [
      {
        ...providers.fal,
        model: fal(
          'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
          'fal-ai/kling-video/v2.5-turbo/pro/text-to-video'
        ),

        // https://fal.ai/models - $0.35 for 5s, $0.70 for 10s
        getCost: ({ duration }) => {
          return duration <= 5 ? 0.35 : 0.7;
        },
      },
    ],
    durations: [5, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    default: true,
    enabled: true,
  },
  'fal-sora-2-pro': {
    label: 'Sora 2 Pro',
    chef: providers.fal,
    providers: [
      {
        ...providers.fal,
        model: fal('fal-ai/sora-2/image-to-video/pro', undefined),

        // https://fal.ai/models - $1.20 (fixed price)
        // Aceita durações: 4s, 8s, ou 12s
        getCost: ({ duration }) => {
          return 1.2;
        },
      },
    ],
    durations: [4, 8, 12],
    aspectRatios: ['16:9', '9:16', '1:1'],
    enabled: true,
  },
  'fal-wan-25-preview': {
    label: 'WAN-25 Preview (Text-to-Video)',
    chef: providers.fal,
    providers: [
      {
        ...providers.fal,
        model: fal('fal-ai/wan-25-preview/text-to-video', undefined),

        // https://fal.ai/models/wan-25-preview - Pricing TBD (preview model)
        getCost: ({ duration }) => {
          // Assuming similar pricing to other text-to-video models
          return duration <= 5 ? 0.5 : 1.0;
        },
      },
    ],
    durations: [5, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    enabled: true,
  },
};

/**
 * Retorna apenas os modelos de vídeo que estão habilitados
 * Use esta função para filtrar modelos ativos na UI
 */
export const getEnabledVideoModels = (): Record<string, TersaVideoModel> => {
  if (!videoModels || typeof videoModels !== 'object') {
    console.error('videoModels is not properly initialized:', videoModels);
    return {};
  }
  return Object.fromEntries(
    Object.entries(videoModels).filter(([_, model]) => model.enabled !== false)
  );
};

/**
 * Retorna todos os modelos de vídeo (incluindo desabilitados)
 * Use esta função para administração ou configuração
 */
export const getAllVideoModels = (): Record<string, TersaVideoModel> => {
  if (!videoModels || typeof videoModels !== 'object') {
    console.error('videoModels is not properly initialized:', videoModels);
    return {};
  }
  return videoModels;
};
