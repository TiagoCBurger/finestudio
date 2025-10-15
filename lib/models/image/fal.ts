import { env } from '@/lib/env';
import type { ImageModel, ImageModelCallWarning } from 'ai';

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
    doGenerate: async ({
      prompt,
      seed,
      size,
      abortSignal,
      providerOptions,
    }) => {
      const [width, height] = size?.split('x').map(Number) ?? [1024, 1024];

      // Build input based on model type
      const input: Record<string, unknown> = {
        prompt,
        num_images: 1,
      };

      // Nano Banana has different format
      const isNanoBanana = modelId === 'fal-ai/nano-banana/edit';
      const isGptImageEdit = modelId === 'fal-ai/gpt-image-1/edit-image/byok';
      const isFluxImageToImage = modelId === 'fal-ai/flux/dev/image-to-image';

      if (isNanoBanana) {
        // Nano Banana supports multiple images natively!
        const images = providerOptions?.fal?.images;
        if (Array.isArray(images) && images.length > 0) {
          input.image_urls = images; // Use all images
          input.strength = 0.75;
        } else if (typeof providerOptions?.fal?.image === 'string') {
          input.image_urls = [providerOptions.fal.image]; // Single image
          input.strength = 0.75;
        }
      } else if (isGptImageEdit) {
        // GPT Image Edit requires image_urls array and OpenAI API key
        const images = providerOptions?.fal?.images;
        if (Array.isArray(images) && images.length > 0) {
          input.image_urls = images;
        } else if (typeof providerOptions?.fal?.image === 'string') {
          input.image_urls = [providerOptions.fal.image];
        }

        // OpenAI API key is required for BYOK model
        const openaiKey = providerOptions?.fal?.openai_api_key || env.OPENAI_API_KEY;
        if (!openaiKey) {
          throw new Error('OpenAI API key is required for GPT Image Edit model');
        }
        input.openai_api_key = openaiKey;
      } else if (isFluxImageToImage) {
        // FLUX Dev Image-to-Image
        input.image_size = {
          width,
          height,
        };

        if (typeof providerOptions?.fal?.image === 'string') {
          input.image_url = providerOptions.fal.image;
          const strengthValue = providerOptions?.fal?.strength;
          input.strength = typeof strengthValue === 'string' ? parseFloat(strengthValue) :
            typeof strengthValue === 'number' ? strengthValue : 0.95;
        }
      } else {
        // Standard FLUX models
        input.image_size = {
          width,
          height,
        };

        if (typeof providerOptions?.fal?.image === 'string') {
          input.image_url = providerOptions.fal.image;
          input.strength = 0.75;
        }
      }

      if (seed !== undefined) {
        input.seed = seed;
      }

      const headers: Record<string, string> = {
        'Authorization': `Key ${env.FAL_API_KEY}`,
        'Content-Type': 'application/json',
      };

      // Use direct API call (synchronous)
      console.log('Fal.ai request:', {
        modelId,
        isNanoBanana: modelId === 'fal-ai/nano-banana/edit',
        isGptImageEdit: modelId === 'fal-ai/gpt-image-1/edit-image/byok',
        isFluxImageToImage: modelId === 'fal-ai/flux/dev/image-to-image',
        hasImageUrl: !!input.image_url,
        hasImageUrls: !!input.image_urls,
        hasOpenAIKey: !!input.openai_api_key,
        input
      });

      const response = await fetch(`https://fal.run/${modelId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
        signal: abortSignal,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Fal.ai request failed:', {
          status: response.status,
          error,
          modelId,
        });
        throw new Error(`Failed to generate image: ${error}`);
      }

      const result = (await response.json()) as FalImageOutput;

      if (!result.images || result.images.length === 0) {
        throw new Error('No images generated');
      }

      const imageUrl = result.images[0].url;
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();

      const warnings: ImageModelCallWarning[] = result.has_nsfw_concepts?.[0]
        ? [{ type: 'other', message: 'NSFW content detected' }]
        : [];

      return {
        images: [new Uint8Array(imageBuffer)],
        warnings,
        response: {
          timestamp: new Date(),
          modelId,
          headers: undefined,
        },
      };
    },
  }),
};
