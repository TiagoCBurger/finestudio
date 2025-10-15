import type { JSONContent } from '@tiptap/core';
import { TextTransform } from './transform';

export type TextNodeProps = {
  type: string;
  data: {
    generated?: {
      text: string;
      sources?: Array<{ type: string; url?: string; title?: string }>;
    };
    model?: string;
    updatedAt?: string;
    instructions?: string;

    // Tiptap generated JSON content
    content?: JSONContent;

    // Tiptap text content
    text?: string;

    // Chat messages
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
  id: string;
};

export const TextNode = (props: TextNodeProps) => {
  // Sempre usa TextTransform, independente de ter conexões ou não
  return <TextTransform {...props} title="Text" />;
};
