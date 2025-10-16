'use server';

import { getSubscribedUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { getAllVideoModelsServer } from '@/lib/models/video/index.server';
import { uploadFile } from '@/lib/upload.server';
import { projects } from '@/schema';
import type { Edge, Node, Viewport } from '@xyflow/react';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

type GenerateVideoActionProps = {
  modelId: string;
  prompt: string;
  images: {
    url: string;
    type: string;
  }[];
  duration?: number;
  aspectRatio?: string;
  nodeId: string;
  projectId: string;
};

export const generateVideoAction = async ({
  modelId,
  prompt,
  images,
  duration = 5,
  aspectRatio = '16:9',
  nodeId,
  projectId,
}: GenerateVideoActionProps): Promise<
  | {
    nodeData: object;
  }
  | {
    error: string;
  }
> => {
  try {
    await getSubscribedUser(); // Verify user is authenticated
    const allModels = getAllVideoModelsServer();
    const model = allModels[modelId];

    if (!model) {
      throw new Error('Model not found');
    }

    const provider = model.providers[0];

    let firstFrameImage = images.at(0)?.url;

    if (firstFrameImage && process.env.NODE_ENV !== 'production') {
      const response = await fetch(firstFrameImage);
      const blob = await response.blob();
      const uint8Array = new Uint8Array(await blob.arrayBuffer());
      const base64 = Buffer.from(uint8Array).toString('base64');

      firstFrameImage = `data:${images.at(0)?.type};base64,${base64}`;
    }

    console.log('[Video Generation] Image prompt:', firstFrameImage ? 'Present' : 'None');

    const url = await provider.model.generate({
      prompt,
      imagePrompt: firstFrameImage || undefined, // Garantir que seja undefined, não null
      duration: duration as 5,
      aspectRatio,
    });

    // ✅ Check if this is a pending webhook job
    if (typeof url === 'string' && url.startsWith('pending:')) {
      const requestId = url.replace('pending:', '');

      console.log('[Video Generation] Job submitted to webhook queue:', requestId);
      console.log('[Video Generation] Returning pending status, frontend will poll for completion');

      // Return pending status with request ID for frontend polling
      return {
        nodeData: {
          status: 'pending',
          requestId,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    console.log('[Video Generation] Downloading video from:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    console.log('[Video Generation] Video downloaded successfully, size:', response.headers.get('content-length'));

    const arrayBuffer = await response.arrayBuffer();
    console.log('[Video Generation] ArrayBuffer size:', arrayBuffer.byteLength);

    // Rastreamento de créditos removido

    // Create a File object from the video data
    const videoFile = new File([arrayBuffer], `${nanoid()}.mp4`, {
      type: 'video/mp4',
    });

    console.log('[Video Generation] Uploading video to storage...');

    // Use the storage abstraction layer
    const uploadResult = await uploadFile(videoFile, 'files');

    console.log('[Video Generation] Video uploaded successfully:', uploadResult.url);

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
        type: 'video/mp4',
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
