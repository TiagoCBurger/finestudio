import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import type { TextNodeProps } from '.';
import { NodeLayout } from '../layout';
import { useChatStream } from '@/hooks/use-chat-stream';
import { handleError } from '@/lib/error/handle';
import { getEnabledTextModels, type TextModel } from '@/lib/models/text';
import type { TersaModel } from '@/lib/providers';
import { providers } from '@/lib/providers';
import { useGateway } from '@/providers/gateway/client';
import { ModelSelector } from '../model-selector';
import { useProject } from '@/providers/project';
import { SendIcon, SquareIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type TextPrimitiveProps = TextNodeProps & {
  title: string;
};

const getDefaultModel = (models: Record<string, TersaModel | TextModel>) => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => 'default' in model && model.default
  );

  if (!defaultModel) {
    return 'openai/gpt-4o-mini-search-preview';
  }

  return defaultModel[0];
};

export const TextPrimitive = ({
  data,
  id,
  type,
  title,
}: TextPrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const project = useProject();
  const { models: gatewayModels } = useGateway();

  // Merge OpenRouter models with Gateway models
  const allModels = useMemo(() => {
    const openRouterModels = getEnabledTextModels();

    // Convert OpenRouter models to TersaModel format
    const convertedOpenRouterModels: Record<string, TersaModel> = {};
    for (const [id, model] of Object.entries(openRouterModels)) {
      // Extract the provider from the model ID (e.g., "openai" from "openai/gpt-5-pro")
      const [providerKey] = id.split('/');
      const provider = providerKey in providers
        ? providers[providerKey as keyof typeof providers]
        : providers.unknown;

      convertedOpenRouterModels[id] = {
        label: model.label,
        chef: provider,
        providers: [provider],
        disabled: !model.enabled,
        default: model.default,
      };
    }

    return { ...gatewayModels, ...convertedOpenRouterModels };
  }, [gatewayModels]);

  const modelId = data.model ?? getDefaultModel(allModels);

  const { sendMessage, messages, setMessages, status, stop } = useChatStream({
    api: '/api/chat',
    onError: (error) => handleError('Error in chat', error),
    onFinish: ({ message }) => {
      updateNodeData(id, {
        updatedAt: new Date().toISOString(),
      });
    },
  });

  // Load initial messages from saved data
  useEffect(() => {
    if (data.messages && data.messages.length > 0 && messages.length === 0) {
      const loadedMessages = data.messages.map((msg, index) => ({
        id: `${id}-msg-${index}`,
        role: msg.role,
        parts: [{ type: 'text', text: msg.content }]
      }));
      setMessages(loadedMessages as any);
    }
  }, [data.messages, messages.length, setMessages, id]);

  // Persist messages whenever they change (with debounce to avoid too many updates)
  useEffect(() => {
    if (messages.length > 0) {
      const simpleMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.parts.find((part) => part.type === 'text')?.text || '',
      }));

      // Only update if messages changed
      const currentMessages = JSON.stringify(data.messages || []);
      const newMessages = JSON.stringify(simpleMessages);
      
      if (currentMessages !== newMessages) {
        updateNodeData(id, {
          messages: simpleMessages,
        });
      }
    }
  }, [messages, id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (newMessage.trim() === '' || !project?.id) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    
    try {
      // Send to AI - useChat will handle adding messages
      await sendMessage(
        {
          text: messageText,
        },
        {
          body: {
            modelId,
          },
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [newMessage, sendMessage, modelId, project?.id]);

  const handleModelChange = useCallback(
    (value: string) => {
      updateNodeData(id, { model: value });
    },
    [id, updateNodeData]
  );

  const toolbar = useMemo(() => {
    const items: ComponentProps<typeof NodeLayout>['toolbar'] = [];

    items.push({
      children: (
        <ModelSelector
          value={modelId}
          options={allModels}
          key={id}
          className="w-[200px] rounded-full"
          onChange={handleModelChange}
        />
      ),
    });

    if (status === 'submitted' || status === 'streaming') {
      items.push({
        tooltip: 'Stop',
        children: (
          <Button
            size="icon"
            className="rounded-full"
            onClick={stop}
            disabled={!project?.id}
          >
            <SquareIcon size={12} />
          </Button>
        ),
      });
    }

    return items;
  }, [modelId, id, allModels, handleModelChange, status, stop, project?.id]);

  return (
    <NodeLayout
      id={id}
      data={data}
      title={title}
      type={type}
      className="overflow-hidden p-0"
      toolbar={toolbar}
    >
      <div className="nowheel flex flex-col h-full max-h-[30rem]">
        <ScrollArea className="flex-grow p-4">
          <div className="space-y-3">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-lg max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {msg.parts.find((part) => part.type === 'text')?.text || ''}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <div className="p-3 border-t flex items-center gap-2 bg-background">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-grow"
            disabled={status === 'submitted' || status === 'streaming' || !project?.id}
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon"
            disabled={status === 'submitted' || status === 'streaming' || !newMessage.trim() || !project?.id}
          >
            <SendIcon size={16} />
          </Button>
        </div>
      </div>
    </NodeLayout>
  );
};
