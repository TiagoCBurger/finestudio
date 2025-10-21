'use server';

import { getSubscribedUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { imageModelsServer } from '@/lib/models/image/index.server';
// Stripe removido - sem rastreamento de créditos
import { createClient } from '@/lib/supabase/server';
import { projects } from '@/schema';
import type { Edge, Node, Viewport } from '@xyflow/react';
import {
  type Experimental_GenerateImageResult,
  experimental_generateImage as generateImage,
} from 'ai';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import OpenAI, { toFile } from 'openai';

type EditImageActionProps = {
  images: {
    url: string;
    type: string;
  }[];
  modelId: string;
  instructions?: string;
  nodeId: string;
  projectId: string;
  size?: string;
};

const generateGptImage1Image = async ({
  prompt,
  size,
  images,
}: {
  prompt: string;
  size?: string;
  images: {
    url: string;
    type: string;
  }[];
}) => {
  const openai = new OpenAI();
  const promptImages = await Promise.all(
    images.map(async (image) => {
      const response = await fetch(image.url);
      const blob = await response.blob();

      return toFile(blob, nanoid(), {
        type: image.type,
      });
    })
  );

  const response = await openai.images.edit({
    model: 'gpt-image-1',
    image: promptImages,
    prompt,
    size: size as never | undefined,
    quality: 'high',
  });

  const json = response.data?.at(0)?.b64_json;

  if (!json) {
    throw new Error('No response JSON found');
  }

  const image: Experimental_GenerateImageResult['image'] = {
    base64: json,
    uint8Array: Buffer.from(json, 'base64'),
    mediaType: 'image/png',
  };

  return {
    image,
    usage: {
      textInput: response.usage?.input_tokens_details.text_tokens,
      imageInput: response.usage?.input_tokens_details.image_tokens,
      output: response.usage?.output_tokens,
    },
  };
};

export const editImageAction = async ({
  images,
  instructions,
  modelId,
  nodeId,
  projectId,
  size,
}: EditImageActionProps): Promise<
  | {
    nodeData: object;
  }
  | {
    error: string;
  }
> => {
  try {
    const client = await createClient();
    const user = await getSubscribedUser();

    const model = imageModelsServer[modelId];

    if (!model) {
      throw new Error('Model not found');
    }

    if (!model.supportsEdit) {
      throw new Error('Model does not support editing');
    }

    // Check if KIE model has a dedicated edit model
    const isKieModel = model.chef.id === 'kie';
    const kieEditModelId = isKieModel && model.providerOptions?.kie?.editModelId
      ? model.providerOptions.kie.editModelId
      : undefined;

    // Debug logging (development only)
    if (isKieModel && process.env.NODE_ENV === 'development') {
      console.log('🔍 KIE model detected:', {
        modelId,
        hasEditModel: !!kieEditModelId,
        editModelId: kieEditModelId,
      });
    }

    // Use edit model for KIE if available
    let provider = model.providers[0];
    if (kieEditModelId && typeof kieEditModelId === 'string') {
      console.log(`🔄 Switching KIE model from ${provider.model.modelId} to ${kieEditModelId} for editing`);
      provider = {
        ...provider,
        model: {
          ...provider.model,
          modelId: kieEditModelId,
        },
      };
    } else if (isKieModel && !kieEditModelId) {
      console.warn('⚠️ KIE model does not have editModelId configured');
    }

    let image: Experimental_GenerateImageResult['image'] | undefined;
    let responseHeaders: any = {};

    const defaultPrompt =
      images.length > 1
        ? 'Create a variant of the image.'
        : 'Create a single variant of the images.';

    const prompt =
      !instructions || instructions === '' ? defaultPrompt : instructions;

    if (provider.model.modelId === 'gpt-image-1') {
      const generatedImageResponse = await generateGptImage1Image({
        prompt,
        images,
        size,
      });

      // Rastreamento de créditos removido

      image = generatedImageResponse.image;
      responseHeaders = {};
    } else {
      const base64Image = await fetch(images[0].url)
        .then((res) => res.arrayBuffer())
        .then((buffer) => Buffer.from(buffer).toString('base64'));

      const isFalProvider = provider.model.provider === 'fal';
      const isKieProvider = provider.model.provider === 'kie';

      // Para múltiplas imagens, crie um prompt mais detalhado
      let enhancedPrompt = prompt;
      if (images.length > 1) {
        enhancedPrompt = `${prompt}

MULTIPLE IMAGES CONTEXT:
- Total images: ${images.length}
- Primary image (base): Use as the main reference
- Additional images: Incorporate their visual elements, style, composition, colors, and mood
- Goal: Create a cohesive blend that combines the best aspects of all images
- Style: Maintain artistic consistency while merging elements naturally

Please analyze all the visual elements from the connected images and create a harmonious composition that incorporates elements from each image.`;
      }

      // For KIE models, use the edit model if specified
      let modelToUse = provider.model;
      if (isKieProvider && kieEditModelId) {
        console.log(`🔄 Switching KIE model from ${provider.model.modelId} to ${kieEditModelId} for edit operation`);
        const { kieAIServer } = await import('@/lib/models/image/kie.server');
        modelToUse = kieAIServer.image(kieEditModelId as 'google/nano-banana' | 'google/nano-banana-edit');
      }

      const generatedImageResponse = await generateImage({
        model: modelToUse,
        prompt: enhancedPrompt,
        size: size as never,
        providerOptions: isFalProvider
          ? {
            fal: {
              image: images[0].url, // Primeira imagem
              images: images.map((img) => img.url), // Todas as imagens (para Nano Banana)
              nodeId, // Para atualização do project via webhook
              projectId, // Para atualização do project via webhook
            },
          }
          : isKieProvider
            ? {
              kie: {
                image: images[0].url, // Single image (backward compatibility)
                images: images.map((img) => img.url), // All images (array format)
                nodeId,
                projectId,
              },
            }
            : {
              bfl: {
                image: base64Image,
              },
            },
      });

      // Rastreamento de créditos removido

      // Try to get response headers if available
      responseHeaders = (generatedImageResponse as any).response?.headers || {};

      // Verificar se está em modo webhook ANTES de tentar acessar image
      const isPending = responseHeaders['x-fal-status'] === 'pending';

      console.log('Checking pending status:', {
        isPending,
        hasHeaders: !!responseHeaders,
        falStatus: responseHeaders['x-fal-status'],
        falRequestId: responseHeaders['x-fal-request-id'],
        hasImage: !!generatedImageResponse.image,
      });

      if (isPending) {
        console.log('✅ Image edit pending, returning placeholder for webhook polling');

        const requestId = responseHeaders['x-fal-request-id'] || responseHeaders['x-kie-request-id'];

        // Atualizar o nó no content para persistir o estado de loading
        const project = await database.query.projects.findFirst({
          where: eq(projects.id, projectId),
        });

        if (project) {
          const content = project.content as {
            nodes: Node[];
            edges: Edge[];
            viewport: Viewport;
          };

          if (content && Array.isArray(content.nodes)) {
            const updatedNodes = content.nodes.map((node) => {
              if (node.id === nodeId) {
                return {
                  ...node,
                  data: {
                    ...(node.data ?? {}),
                    generated: {
                      url: '', // URL vazia, será preenchida pelo webhook
                      type: 'image/png',
                      headers: responseHeaders,
                    },
                    loading: true,
                    status: 'generating',
                    requestId,
                    updatedAt: new Date().toISOString(),
                    description: instructions ?? defaultPrompt,
                  },
                };
              }
              return node;
            });

            await database
              .update(projects)
              .set({
                content: { ...content, nodes: updatedNodes },
                updatedAt: new Date(),
              })
              .where(eq(projects.id, projectId));
          }
        }

        return {
          nodeData: {
            generated: {
              url: '', // URL vazia, será preenchida pelo webhook
              type: 'image/png',
              headers: responseHeaders,
            },
            loading: true, // Flag para manter loading state
            status: 'generating',
            requestId,
            updatedAt: new Date().toISOString(),
            description: instructions ?? defaultPrompt,
          },
        };
      }

      // Só acessar image se não estiver em modo pending
      image = generatedImageResponse.image;

      if (!image) {
        // Se não tem imagem E não está pending, algo deu errado
        console.error('No image generated and not in pending state');
        throw new Error('No image generated');
      }
    }

    // Continuar com processamento normal (modo síncrono)
    const bytes = Buffer.from(image.base64, 'base64');
    const contentType = 'image/png';

    const blob = await client.storage
      .from('files')
      .upload(`${user.id}/${nanoid()}`, bytes, {
        contentType,
      });

    if (blob.error) {
      throw new Error(blob.error.message);
    }

    const { data: downloadUrl } = client.storage
      .from('files')
      .getPublicUrl(blob.data.path);

    const finalUrl = downloadUrl.publicUrl;

    const project = await database.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const content = project.content as {
      nodes: Node[];
      edges: Edge[];
      viewport: Viewport;
    };

    if (!content || !Array.isArray(content.nodes)) {
      throw new Error('Invalid project content structure');
    }

    const existingNode = content.nodes.find((n) => n.id === nodeId);

    if (!existingNode) {
      throw new Error('Node not found');
    }

    const newData = {
      ...(existingNode.data ?? {}),
      updatedAt: new Date().toISOString(),
      generated: {
        url: finalUrl,
        type: contentType,
        headers: responseHeaders,
      },
      description: instructions ?? defaultPrompt,
    };

    const updatedNodes = content.nodes.map((existingNode) => {
      if (existingNode.id === nodeId) {
        return {
          ...existingNode,
          data: newData,
        };
      }

      return existingNode;
    });

    await database
      .update(projects)
      .set({ content: { ...content, nodes: updatedNodes } })
      .where(eq(projects.id, projectId));

    return {
      nodeData: newData,
    };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};
