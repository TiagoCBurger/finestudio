import type { ImageModel } from 'ai';

const models = [
  'fal-ai/nano-banana/edit',
  'fal-ai/gpt-image',
  'fal-ai/gpt-image-1/edit-image/byok',
  'fal-ai/flux/dev/image-to-image',
  'fal-ai/flux-pro/kontext',
  'fal-ai/flux-pro/kontext/max/multi',
  'fal-ai/ideogram/character',
] as const;

type FalModel = (typeof models)[number];

type FalImageOutput = {
  images: Array<{
    url: string;
    width: number;
    height: number;
    content_type: string;
  }>;
  seed: number;
  has_nsfw_concepts?: boolean[];
  prompt: string;
};

export const falAI = {
  image: (modelId: FalModel): ImageModel => ({
    modelId,
    provider: 'fal',
    specificationVersion: 'v2',
    maxImagesPerCall: 1,
    doGenerate: async () => {
      throw new Error('Image generation must be called from server-side code');
    },
  }),
};
