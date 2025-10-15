'use server';

import { getSubscribedUser } from '@/lib/auth';
import { withCreditCheck } from '@/lib/credits/middleware';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { imageModelsServer } from '@/lib/models/image/index.server';
import { visionModels } from '@/lib/models/vision';
import { createClient } from '@/lib/supabase/server';
import { projects } from '@/schema';
import type { Edge, Node, Viewport } from '@xyflow/react';
import {
  type Experimental_GenerateImageResult,
  experimental_generateImage as generateImage,
} from 'ai';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import OpenAI from 'openai';

type GenerateImageActionProps = {
  prompt: string;
  nodeId: string;
  projectId: string;
  modelId: string;
  instructions?: string;
  size?: string;
};

const generateGptImage1Image = async ({
  instructions,
  prompt,
  size,
}: {
  instructions?: string;
  prompt: string;
  size?: string;
}) => {
  const openai = new OpenAI();
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: [
      'Generate an image based on the following instructions and context.',
      '---',
      'Instructions:',
      instructions ?? 'None.',
      '---',
      'Context:',
      prompt,
    ].join('\n'),
    size: size as never | undefined,
    moderation: 'low',
    quality: 'high',
    output_format: 'png',
  });

  const json = response.data?.at(0)?.b64_json;

  if (!json) {
    throw new Error('No response JSON found');
  }

  if (!response.usage) {
    throw new Error('No usage found');
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
    const client = await createClient();
    const user = await getSubscribedUser();
    const model = imageModelsServer[modelId];

    if (!model) {
      throw new Error('Model not found');
    }

    let image: Experimental_GenerateImageResult['image'] | undefined;
    let responseHeaders: any = {};

    const provider = model.providers[0];

    if (provider.model.modelId === 'gpt-image-1') {
      const generatedImageResponse = await generateGptImage1Image({
        instructions,
        prompt,
        size,
      });

      // Rastreamento de créditos removido

      image = generatedImageResponse.image;
      responseHeaders = generatedImageResponse.response?.headers || {};

      // Tentar obter do providerMetadata
      const falMetadata = (generatedImageResponse as any).providerMetadata?.fal;
      if (falMetadata) {
        responseHeaders = {
          'x-fal-request-id': falMetadata.requestId,
          'x-fal-status': falMetadata.status,
        };
      }
    } else {
      let aspectRatio: `${number}:${number}` | undefined;
      if (size) {
        const [width, height] = size.split('x').map(Number);
        const divisor = gcd(width, height);
        aspectRatio = `${width / divisor}:${height / divisor}`;
      }

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
        providerOptions: {
          fal: {
            nodeId, // Para atualização do project via webhook
            projectId, // Para atualização do project via webhook
          },
        },
      });

      // Rastreamento de créditos removido

      image = generatedImageResponse.image;
      responseHeaders = generatedImageResponse.response?.headers || {};

      // Tentar obter do providerMetadata
      const falMetadata = (generatedImageResponse as any).providerMetadata?.fal;
      if (falMetadata) {
        responseHeaders = {
          'x-fal-request-id': falMetadata.requestId,
          'x-fal-status': falMetadata.status,
        };
      }
    }

    // Se está em modo pending (webhook), retornar imediatamente sem processar
    const isPending = responseHeaders['x-fal-status'] === 'pending';

    console.log('Checking pending status:', {
      isPending,
      hasHeaders: !!responseHeaders,
      falStatus: responseHeaders['x-fal-status'],
      falRequestId: responseHeaders['x-fal-request-id'],
      hasImage: !!image,
    });

    if (isPending) {
      console.log('✅ Image generation pending, returning placeholder for webhook polling');

      return {
        nodeData: {
          generated: {
            url: '', // URL vazia, será preenchida pelo webhook
            type: 'image/png',
            headers: responseHeaders,
          },
          updatedAt: new Date().toISOString(),
          description,
        },
      };
    }

    if (!image) {
      throw new Error('No image generated');
    }

    let extension = image.mediaType.split('/').pop();

    if (extension === 'jpeg') {
      extension = 'jpg';
    }

    const name = `${nanoid()}.${extension}`;

    const file: File = new File([image.uint8Array], name, {
      type: image.mediaType,
    });

    const blob = await client.storage
      .from('files')
      .upload(`${user.id}/${name}`, file, {
        contentType: file.type,
      });

    if (blob.error) {
      throw new Error(blob.error.message);
    }

    const { data: downloadUrl } = client.storage
      .from('files')
      .getPublicUrl(blob.data.path);

    const url =
      process.env.NODE_ENV === 'production'
        ? downloadUrl.publicUrl
        : `data:${image.mediaType};base64,${Buffer.from(image.uint8Array).toString('base64')}`;

    const project = await database.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const visionModel = visionModels[project.visionModel];

    if (!visionModel) {
      throw new Error('Vision model not found');
    }

    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: visionModel.providers[0].model.modelId,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image.' },
            {
              type: 'image_url',
              image_url: {
                url,
              },
            },
          ],
        },
      ],
    });

    const description = response.choices.at(0)?.message.content;

    if (!description) {
      throw new Error('No description found');
    }

    const content = project.content as {
      nodes: Node[];
      edges: Edge[];
      viewport: Viewport;
    };

    const existingNode = content.nodes.find((n) => n.id === nodeId);

    if (!existingNode) {
      throw new Error('Node not found');
    }

    const newData = {
      ...(existingNode.data ?? {}),
      updatedAt: new Date().toISOString(),
      generated: {
        url: downloadUrl.publicUrl,
        type: image.mediaType,
        // Incluir headers da resposta (para webhook polling)
        headers: responseHeaders,
      },
      description,
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
