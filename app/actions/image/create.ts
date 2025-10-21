'use server';

import { getSubscribedUser } from '@/lib/auth';
import { withCreditCheck } from '@/lib/credits/middleware';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { imageModelsServer } from '@/lib/models/image/index.server';
import { uploadFile } from '@/lib/upload.server';
import { projects } from '@/schema';
import type { Edge, Node, Viewport } from '@xyflow/react';
import {
  type Experimental_GenerateImageResult,
  experimental_generateImage as generateImage,
} from 'ai';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

type GenerateImageActionProps = {
  prompt: string;
  nodeId: string;
  projectId: string;
  modelId: string;
  instructions?: string;
  size?: string;
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// Função interna (não exportada) - executa a geração real
const _generateImageAction = async ({
  prompt,
  modelId,
  instructions,
  nodeId,
  projectId,
  size,
}: GenerateImageActionProps): Promise<
  | {
    nodeData: object;
  }
  | {
    error: string;
  }
> => {
  try {
    await getSubscribedUser(); // Verify user is authenticated
    const model = imageModelsServer[modelId];

    if (!model) {
      throw new Error('Model not found');
    }

    let image: Experimental_GenerateImageResult['image'] | undefined;
    let responseHeaders: any = {};

    const provider = model.providers[0];

    // Check if model requires OpenAI API key (BYOK models)
    if (provider.model.modelId === 'gpt-image-1') {
      throw new Error('gpt-image-1 model requires OPENAI_API_KEY which is not configured. Please use a different model.');
    }

    {
      let aspectRatio: `${number}:${number}` | undefined;
      if (size && typeof size === 'string' && size.includes('x')) {
        const parts = size.split('x');
        if (parts.length === 2) {
          const [width, height] = parts.map(Number);
          const divisor = gcd(width, height);
          aspectRatio = `${width / divisor}:${height / divisor}`;
        }
      }

      const isFalProvider = provider.model.provider === 'fal';
      const isKieProvider = provider.model.provider === 'kie';

      console.log('🔍 Provider detection:', {
        modelId,
        provider: provider.model.provider,
        isFalProvider,
        isKieProvider,
        nodeId,
        projectId,
      });

      const generatedImageResponse = await generateImage({
        model: provider.model,
        prompt: [
          'Generate an image based on the following instructions and context.',
          '---',
          'Instructions:',
          instructions ?? 'None.',
          '---',
          'Context:',
          prompt,
        ].join('\n'),
        size: size as never,
        aspectRatio,
        providerOptions: isFalProvider
          ? {
            fal: {
              nodeId, // Para atualização do project via webhook
              projectId, // Para atualização do project via webhook
            },
          }
          : isKieProvider
            ? {
              kie: {
                nodeId,
                projectId,
              },
            }
            : undefined,
      });

      // Rastreamento de créditos removido

      // Try to get response headers if available
      responseHeaders = (generatedImageResponse as any).response?.headers || {};

      // Verificar se está em modo webhook ANTES de tentar acessar image
      const isFalPending = responseHeaders['x-fal-status'] === 'pending';
      const isKiePending = responseHeaders['x-kie-status'] === 'pending';
      const isPending = isFalPending || isKiePending;

      console.log('Checking pending status:', {
        isPending,
        isFalPending,
        isKiePending,
        hasHeaders: !!responseHeaders,
        falStatus: responseHeaders['x-fal-status'],
        kieStatus: responseHeaders['x-kie-status'],
        falRequestId: responseHeaders['x-fal-request-id'],
        kieRequestId: responseHeaders['x-kie-request-id'],
        hasImage: !!generatedImageResponse.image,
      });

      if (isPending) {
        console.log('✅ Image generation pending, returning placeholder for webhook polling');

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
          },
        };
      }

      // Só acessar image se não estiver em modo pending
      image = generatedImageResponse.image;

      if (!image) {
        throw new Error('No image generated');
      }
    }

    let extension = image.mediaType.split('/').pop();

    if (extension === 'jpeg') {
      extension = 'jpg';
    }

    const name = `${nanoid()}.${extension}`;

    const file: File = new File([Buffer.from(image.uint8Array)], name, {
      type: image.mediaType,
    });

    // Use the storage abstraction layer
    const uploadResult = await uploadFile(file, 'files', name);

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
        url: uploadResult.url,
        type: image.mediaType,
        // Incluir headers da resposta (para webhook polling)
        headers: responseHeaders,
      },
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

/**
 * VERSÃO PROTEGIDA COM CRÉDITOS - Esta é a função que deve ser usada
 * Automaticamente debita créditos baseado no modelo e parâmetros
 */
export const generateImageAction = withCreditCheck(
  _generateImageAction,
  // O modelId será extraído dos parâmetros dinamicamente
  'dynamic', // Placeholder - será substituído no middleware
  // Parâmetros de custo serão calculados dinamicamente
);

// Versão customizada que calcula custo baseado nos parâmetros reais
export const generateImageActionWithCredits = async (params: GenerateImageActionProps) => {
  // Criar versão protegida específica para este modelo e parâmetros
  const protectedAction = withCreditCheck(
    _generateImageAction,
    params.modelId,
    {
      resolution: params.size,
      quality: 'standard' // Pode ser extraído dos parâmetros se disponível
    }
  );

  return await protectedAction(params);
};
