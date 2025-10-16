import type { VideoModel } from '@/lib/models/video';

type FalVideoModel =
    | 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video'
    | 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video'
    | 'fal-ai/sora-2/image-to-video/pro'
    | 'fal-ai/wan-25-preview/text-to-video';

export const fal = (
    imageToVideoModelId: FalVideoModel,
    textToVideoModelId?: FalVideoModel
): VideoModel => ({
    modelId: imageToVideoModelId,
    textToVideoModelId,
    generate: async () => {
        throw new Error('Video generation must be called from server-side code');
    },
});
