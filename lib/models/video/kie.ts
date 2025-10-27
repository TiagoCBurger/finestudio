import type { VideoModel } from '@/lib/models/video';

type KieVideoModel =
    | 'kling/v2-5-turbo-image-to-video-pro'
    | 'kling/v2-5-turbo-text-to-video-pro';

export const kie = (
    imageToVideoModelId: KieVideoModel,
    textToVideoModelId?: KieVideoModel
): VideoModel => ({
    modelId: imageToVideoModelId,
    textToVideoModelId,
    generate: async () => {
        throw new Error('Video generation must be called from server-side code');
    },
});
