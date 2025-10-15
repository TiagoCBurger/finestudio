import { useCallback, useState } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];
}

export interface MessagePart {
  type: 'text' | 'reasoning' | 'source-url';
  text?: string;
  url?: string;
}

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error';

interface UseChatStreamOptions {
  api?: string;
  onError?: (error: Error) => void;
  onFinish?: (data: { message: Message }) => void;
}

interface SendMessageOptions {
  body?: Record<string, any>;
}

interface SendMessageData {
  text: string;
  files?: Array<{
    type: string;
    url: string;
    mediaType: string;
  }>;
}

export function useChatStream({ api = '/api/chat', onError, onFinish }: UseChatStreamOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const sendMessage = useCallback(
    async (data: SendMessageData, options?: SendMessageOptions) => {
      const controller = new AbortController();
      setAbortController(controller);
      setStatus('submitted');

      try {
        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          parts: [{ type: 'text', text: data.text }],
        };

        setMessages((prev) => [...prev, userMessage]);

        // Prepare request body
        const requestBody = {
          messages: [
            {
              role: 'user',
              text: data.text,
              files: data.files,
            },
          ],
          ...options?.body,
        };

        console.log('Sending request to API:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(api, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setStatus('streaming');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        let assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          parts: [],
        };
        
        let currentText = '';

        while (reader) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              // Parse Vercel AI SDK data stream format
              if (line.startsWith('0:')) {
                const data = JSON.parse(line.slice(2));
                
                if (data.textDelta) {
                  currentText += data.textDelta;
                  assistantMessage = {
                    ...assistantMessage,
                    parts: [{ type: 'text', text: currentText }],
                  };
                  
                  setMessages((prev) => {
                    const withoutLast = prev.slice(0, -1);
                    const lastMsg = prev[prev.length - 1];
                    
                    if (lastMsg?.role === 'assistant') {
                      return [...withoutLast, assistantMessage];
                    }
                    return [...prev, assistantMessage];
                  });
                }
                
                if (data.finishReason) {
                  setStatus('idle');
                  onFinish?.({ message: assistantMessage });
                }
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', e);
            }
          }
        }
        
        setStatus('idle');
      } catch (error) {
        setStatus('error');
        if (error instanceof Error) {
          onError?.(error);
        }
      } finally {
        setAbortController(null);
      }
    },
    [api, onError, onFinish]
  );

  const stop = useCallback(() => {
    abortController?.abort();
    setAbortController(null);
    setStatus('idle');
  }, [abortController]);

  return {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
  };
}
