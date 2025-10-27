import type { VideoModel } from '@/lib/models/video';

type KieVideoModel = 'kling/v2-5-turbo-image-to-video-pro';

export const kie = (modelId: KieVideoModel): VideoModel => ({
    modelId,
    generate: async () => {
        throw new Error('Video generation must be called from server-side code');
    },
});
