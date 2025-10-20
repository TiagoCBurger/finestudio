import type { AudioNodeProps } from '@/components/nodes/audio';
import type { CodeNodeProps } from '@/components/nodes/code';
import type { FileNodeProps } from '@/components/nodes/file';
import type { ImageNodeProps } from '@/components/nodes/image';
import type { TextNodeProps } from '@/components/nodes/text';
import type { TweetNodeProps } from '@/components/nodes/tweet';
import type { Node } from '@xyflow/react';

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

    return [...sourceImages, ...generatedImages];
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

export const getCodeFromCodeNodes = (nodes: Node[]) => {
  if (!Array.isArray(nodes)) {
    console.error('getCodeFromCodeNodes: nodes is not an array', nodes);
    return [];
  }

  const sourceCodes = nodes
    .filter((node) => node.type === 'code')
    .map((node) => (node.data as CodeNodeProps['data']).content)
    .filter(Boolean) as { text: string; language: string }[];

  const generatedCodes = nodes
    .filter((node) => node.type === 'code' && node.data.generated)
    .map((node) => (node.data as CodeNodeProps['data']).generated)
    .filter(Boolean) as { text: string; language: string }[];

  return [...sourceCodes, ...generatedCodes];
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

export const getTweetContentFromTweetNodes = (nodes: Node[]) => {
  if (!Array.isArray(nodes)) {
    console.error('getTweetContentFromTweetNodes: nodes is not an array', nodes);
    return [];
  }

  const tweets = nodes
    .filter((node) => node.type === 'tweet')
    .map((node) => (node.data as TweetNodeProps['data']).content)
    .filter(Boolean) as NonNullable<TweetNodeProps['data']['content']>[];

  const tweetContent = tweets.map(
    (tweet) => `On ${tweet.date}, ${tweet.author} tweeted: ${tweet.text}`
  );

  return tweetContent;
};
