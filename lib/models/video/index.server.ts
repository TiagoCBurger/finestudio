import {
    type TersaProvider,
    providers,
} from '@/lib/providers';
import { falServer } from './fal.server';
import type { TersaVideoModel } from './index';

export const videoModelsServer: Record<string, TersaVideoModel> = {
    'fal-kling-v2.5-turbo-pro': {
        label: 'Kling Video v2.5 Turbo Pro',
        chef: providers.fal,
        providers: [
            {
                ...providers.fal,
                model: falServer(
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
                model: falServer('fal-ai/sora-2/image-to-video/pro', undefined),

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
};

/**
 * Retorna todos os modelos de vídeo (incluindo desabilitados)
 * Use esta função em server actions
 */
export const getAllVideoModelsServer = (): Record<string, TersaVideoModel> => {
    if (!videoModelsServer || typeof videoModelsServer !== 'object') {
        console.error('videoModelsServer is not properly initialized:', videoModelsServer);
        return {};
    }
    return videoModelsServer;
};
