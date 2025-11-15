import type { AudioNodeProps } from '@/components/nodes/audio';
import type { FileNodeProps } from '@/components/nodes/file';
import type { ImageNodeProps } from '@/components/nodes/image';
import type { TextNodeProps } from '@/components/nodes/text';
import type { Node } from '@xyflow/react';
import type { ImageNodeState } from '@/lib/models/image/types';

// Extended type for image nodes that includes state
type ImageNodeWithState = ImageNodeProps & {
  data: ImageNodeProps['data'] & {
    state?: ImageNodeState;
  };
};

export const getTextFromTextNodes = (nodes: Node[]) => {
  if (!Array.isArray(nodes)) {
    console.error('getTextFromTextNodes: nodes is not an array', nodes);
    return [];
  }

  try {
    const sourceTexts = nodes
      .filter((node) => node.type === 'text' && node.data)
      .map((node) => {
        const data = node.data as TextNodeProps['data'];
        return data?.text;
      });

    const generatedTexts = nodes
      .filter((node) => node.type === 'text' && node.data?.generated)
      .map((node) => {
        const data = node.data as TextNodeProps['data'];
        return data?.generated?.text;
      });

    return [...sourceTexts, ...generatedTexts].filter(Boolean) as string[];
  } catch (error) {
    console.error('Error in getTextFromTextNodes:', error);
    console.error('Problematic nodes:', nodes);
    return [];
  }
};

export const getTranscriptionFromAudioNodes = (nodes: Node[]) => {
  if (!Array.isArray(nodes)) {
    console.error('getTranscriptionFromAudioNodes: nodes is not an array', nodes);
    return [];
  }

  try {
    const transcripts = nodes
      .filter((node) => node.type === 'audio' && node.data)
      .map((node) => {
        const data = node.data as AudioNodeProps['data'];
        return data?.transcript;
      })
      .filter(Boolean) as string[];

    return transcripts;
  } catch (error) {
    console.error('Error in getTranscriptionFromAudioNodes:', error);
    console.error('Problematic nodes:', nodes);
    return [];
  }
};

export const getDescriptionsFromImageNodes = (nodes: Node[]) => {
  if (!Array.isArray(nodes)) {
    console.error('getDescriptionsFromImageNodes: nodes is not an array', nodes);
    return [];
  }

  try {
    const descriptions = nodes
      .filter((node) => node.type === 'image' && node.data)
      .map((node) => {
        const data = node.data as ImageNodeProps['data'];
        return data?.description;
      })
      .filter(Boolean) as string[];

    return descriptions;
  } catch (error) {
    console.error('Error in getDescriptionsFromImageNodes:', error);
    console.error('Problematic nodes:', nodes);
    return [];
  }
};

export const getImagesFromImageNodes = (nodes: Node[]) => {
  if (!Array.isArray(nodes)) {
    console.error('getImagesFromImageNodes: nodes is not an array', nodes);
    return [];
  }

  try {
    console.log('🔍 [getImagesFromImageNodes] Processing nodes:', {
      totalNodes: nodes.length,
      imageNodes: nodes.filter(n => n.type === 'image').length,
      nodeDetails: nodes.filter(n => n.type === 'image').map(n => {
        const data = n.data as ImageNodeWithState['data'];
        return {
          id: n.id,
          hasContent: !!data?.content,
          hasGenerated: !!data?.generated,
          hasState: !!data?.state,
          stateStatus: data?.state?.status,
          stateUrl: data?.state?.status === 'ready' ? data.state.url : undefined,
          content: data?.content,
          generated: data?.generated,
        };
      })
    });

    const sourceImages = nodes
      .filter((node) => node.type === 'image' && node.data)
      .map((node) => {
        const data = node.data as ImageNodeProps['data'];
        return data?.content;
      })
      .filter(Boolean) as { url: string; type: string }[];

    const generatedImages = nodes
      .filter((node) => node.type === 'image' && node.data)
      .map((node) => {
        const data = node.data as ImageNodeProps['data'];
        return data?.generated;
      })
      .filter(Boolean) as { url: string; type: string }[];

    // NOVO: Também pegar imagens do state.url quando status é 'ready'
    const stateImages = nodes
      .filter((node) => node.type === 'image' && node.data)
      .map((node) => {
        const data = node.data as ImageNodeWithState['data'];
        // Se tem state.url e status é ready, usar essa URL
        if (data?.state?.status === 'ready') {
          return { url: data.state.url, type: 'image/png' };
        }
        return null;
      })
      .filter(Boolean) as { url: string; type: string }[];

    const allImages = [...sourceImages, ...generatedImages, ...stateImages];

    console.log('🔍 [getImagesFromImageNodes] Results:', {
      sourceCount: sourceImages.length,
      generatedCount: generatedImages.length,
      stateCount: stateImages.length,
      totalCount: allImages.length,
      urls: allImages.map(img => img.url)
    });

    return allImages;
  } catch (error) {
    console.error('Error in getImagesFromImageNodes:', error);
    console.error('Problematic nodes:', nodes);
    return [];
  }
};

export const isValidSourceTarget = (source: Node, target: Node) => {
  if (source.type === 'video' || source.type === 'drop') {
    return false;
  }

  if (target.type === 'audio' && source.type !== 'text') {
    return false;
  }

  if (target.type === 'file') {
    return false;
  }

  return true;
};



export const getFilesFromFileNodes = (nodes: Node[]) => {
  if (!Array.isArray(nodes)) {
    console.error('getFilesFromFileNodes: nodes is not an array', nodes);
    return [];
  }

  const files = nodes
    .filter((node) => node.type === 'file')
    .map((node) => (node.data as FileNodeProps['data']).content)
    .filter(Boolean) as { url: string; type: string; name: string }[];

  return files;
};


