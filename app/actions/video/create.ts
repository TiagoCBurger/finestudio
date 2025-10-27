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
  negativePrompt?: string;
  cfgScale?: number;
  nodeId: string;
  projectId: string;
};

/**
 * Updates a node's data in the project and saves to database
 * Triggers Supabase Realtime broadcast for multi-window sync
 */
async function updateProjectNode(
  projectId: string,
  nodeId: string,
  nodeData: object
): Promise<void> {
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

  const updatedNodes = content.nodes.map((node) => {
    if (node.id === nodeId) {
      return {
        ...node,
        data: {
          ...node.data,
          ...nodeData,
        },
      };
    }
    return node;
  });

  await database
    .update(projects)
    .set({
      content: { ...content, nodes: updatedNodes },
      updatedAt: new Date(), // Trigger realtime broadcast
    })
    .where(eq(projects.id, projectId));
}

export const generateVideoAction = async ({
  modelId,
  prompt,
  images,
  duration = 5,
  aspectRatio = '16:9',
  negativePrompt,
  cfgScale,
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

    const firstFrameImage = images.at(0)?.url;

    console.log('[Video Generation] Image prompt:', {
      present: !!firstFrameImage,
      url: firstFrameImage?.substring(0, 100),
      isDataUri: firstFrameImage?.startsWith('data:'),
      isHttpUrl: firstFrameImage?.startsWith('http'),
    });

    const url = await provider.model.generate({
      prompt,
      imagePrompt: firstFrameImage || undefined, // Garantir que seja undefined, não null
      duration: duration as 5,
      aspectRatio,
      negativePrompt,
      cfgScale,
      // Pass metadata for webhook to update the correct node
      _metadata: {
        nodeId,
        projectId,
      },
    });

    // ✅ Check if this is a pending webhook job
    if (typeof url === 'string' && url.startsWith('pending:')) {
      const requestId = url.replace('pending:', '');

      console.log('[Video Generation] Job submitted to webhook queue:', requestId);
      console.log('[Video Generation] Saving loading state to database');

      // Save loading state to database for persistence across page reloads
      const nodeDataWithLoading = {
        status: 'pending' as const,
        requestId,
        loading: true,
        updatedAt: new Date().toISOString(),
      };

      await updateProjectNode(projectId, nodeId, nodeDataWithLoading);

      console.log('[Video Generation] Loading state saved to database');

      return {
        nodeData: nodeDataWithLoading,
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

    const newData = {
      updatedAt: new Date().toISOString(),
      generated: {
        url: uploadResult.url,
        type: 'video/mp4',
      },
    };

    await updateProjectNode(projectId, nodeId, newData);

    return {
      nodeData: newData,
    };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};
