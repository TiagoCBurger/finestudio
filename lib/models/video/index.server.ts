import {
    type TersaProvider,
    providers,
} from '@/lib/providers';
import { kieServer } from './kie.server';
import type { TersaVideoModel } from './index';

export const videoModelsServer: Record<string, TersaVideoModel> = {
    'kie-kling-v2.5-turbo-pro': {
        label: 'Kling Video v2.5 Turbo Pro',
        chef: providers.kie,
        providers: [
            {
                ...providers.kie,
                model: kieServer(
                    'kling/v2-5-turbo-image-to-video-pro',
                    'kling/v2-5-turbo-text-to-video-pro'
                ),

                // KIE pricing for Kling v2.5 Turbo Pro
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
