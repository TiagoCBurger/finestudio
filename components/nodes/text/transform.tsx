import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { useReasoning } from '@/hooks/use-reasoning';
import { handleError } from '@/lib/error/handle';
import {
  getDescriptionsFromImageNodes,
  getFilesFromFileNodes,
  getImagesFromImageNodes,
  getTextFromTextNodes,
  getTranscriptionFromAudioNodes,
  getTweetContentFromTweetNodes,
} from '@/lib/xyflow';
import { getEnabledTextModels, type TextModel } from '@/lib/models/text';
import type { TersaModel } from '@/lib/providers';
import { providers } from '@/lib/providers';
import { useGateway } from '@/providers/gateway/client';
import { useProject } from '@/providers/project';
import { ReasoningTunnel } from '@/tunnels/reasoning';
import { getIncomers, useReactFlow } from '@xyflow/react';
import { useChatStream } from '@/hooks/use-chat-stream';
import {
  ClockIcon,
  CopyIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
} from 'lucide-react';
import {
  type ChangeEventHandler,
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import type { TextNodeProps } from '.';
import { ModelSelector } from '../model-selector';

type TextTransformProps = TextNodeProps & {
  title: string;
};

const getDefaultModel = (models: Record<string, TersaModel | TextModel>) => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => 'default' in model && model.default
  );

  if (!defaultModel) {
    return 'o3';
  }

  return defaultModel[0];
};

export const TextTransform = ({
  data,
  id,
  type,
  title,
}: TextTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
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
  const analytics = useAnalytics();
  const [reasoning, setReasoning] = useReasoning();
  const { sendMessage, messages, setMessages, status, stop } = useChatStream({
    api: '/api/chat',
    onError: (error) => handleError('Error generating text', error),
    onFinish: ({ message }) => {
      console.log('Transform - onFinish called');
      console.log('Transform - Message:', message);
      console.log('Transform - Message parts:', message.parts);

      const textContent = message.parts.find((part) => part.type === 'text')?.text ?? '';
      const sources = message.parts?.filter((part) => part.type === 'source-url') ?? [];

      console.log('Transform - Text content:', textContent);
      console.log('Transform - Sources:', sources);

      updateNodeData(id, {
        generated: {
          text: textContent,
          sources: sources,
        },
        updatedAt: new Date().toISOString(),
      });

      setReasoning((oldReasoning) => ({
        ...oldReasoning,
        isGenerating: false,
      }));

      toast.success('Text generated successfully');

      setTimeout(() => mutate('credits'), 5000);
    },
  });

  const handleGenerate = useCallback(async () => {
    const incomers = getIncomers({ id }, getNodes(), getEdges());
    const textPrompts = getTextFromTextNodes(incomers);
    const audioPrompts = getTranscriptionFromAudioNodes(incomers);
    const images = getImagesFromImageNodes(incomers);
    const imageDescriptions = getDescriptionsFromImageNodes(incomers);
    const tweetContent = getTweetContentFromTweetNodes(incomers);
    const files = getFilesFromFileNodes(incomers);

    if (!textPrompts.length && !audioPrompts.length && !data.instructions) {
      handleError('Error generating text', 'No prompts found');
      return;
    }

    const content: string[] = [];

    if (data.instructions) {
      content.push('--- Instructions ---', data.instructions);
    }

    if (textPrompts.length) {
      content.push('--- Text Prompts ---', ...textPrompts);
    }

    if (audioPrompts.length) {
      content.push('--- Audio Prompts ---', ...audioPrompts);
    }

    if (imageDescriptions.length) {
      content.push('--- Image Descriptions ---', ...imageDescriptions);
    }

    if (tweetContent.length) {
      content.push('--- Tweet Content ---', ...tweetContent);
    }

    analytics.track('canvas', 'node', 'generate', {
      type,
      promptLength: content.join('\n').length,
      model: modelId,
      instructionsLength: data.instructions?.length ?? 0,
      imageCount: images.length,
      fileCount: files.length,
    });

    const attachments: Array<{ type: string; url: string; mediaType: string }> = [];

    for (const image of images) {
      attachments.push({
        mediaType: image.type,
        url: image.url,
        type: 'file',
      });
    }

    for (const file of files) {
      attachments.push({
        mediaType: file.type,
        url: file.url,
        type: 'file',
      });
    }

    setMessages([]);
    await sendMessage(
      {
        text: content.join('\n'),
        files: attachments,
      },
      {
        body: {
          modelId,
        },
      }
    );
  }, [
    sendMessage,
    data.instructions,
    getEdges,
    getNodes,
    id,
    modelId,
    type,
    analytics.track,
    setMessages,
  ]);

  const handleInstructionsChange: ChangeEventHandler<HTMLTextAreaElement> =
    useCallback(
      (event) => {
        updateNodeData(id, { instructions: event.target.value });
      },
      [id]
    );

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, []);

  const handleModelChange = useCallback(
    (value: string) => {
      updateNodeData(id, { model: value });
    },
    [id]
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
    } else if (messages.length || data.generated?.text) {
      const text = messages.length
        ? messages
          .filter((message) => message.role === 'assistant')
          .map(
            (message) =>
              message.parts.find((part) => part.type === 'text')?.text ?? ''
          )
          .join('\n')
        : data.generated?.text;

      items.push({
        tooltip: 'Regenerate',
        children: (
          <Button
            size="icon"
            className="rounded-full"
            onClick={handleGenerate}
            disabled={!project?.id}
          >
            <RotateCcwIcon size={12} />
          </Button>
        ),
      });
      items.push({
        tooltip: 'Copy',
        children: (
          <Button
            size="icon"
            className="rounded-full"
            disabled={!text}
            onClick={() => handleCopy(text ?? '')}
            variant="ghost"
          >
            <CopyIcon size={12} />
          </Button>
        ),
      });
    } else {
      items.push({
        tooltip: 'Generate',
        children: (
          <Button
            size="icon"
            className="rounded-full"
            onClick={handleGenerate}
            disabled={!project?.id}
          >
            <PlayIcon size={12} />
          </Button>
        ),
      });
    }

    if (data.updatedAt) {
      items.push({
        tooltip: `Last updated: ${new Intl.DateTimeFormat('en-US', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(data.updatedAt))}`,
        children: (
          <Button size="icon" variant="ghost" className="rounded-full">
            <ClockIcon size={12} />
          </Button>
        ),
      });
    }

    return items;
  }, [
    data.generated?.text,
    data.updatedAt,
    handleGenerate,
    handleModelChange,
    modelId,
    id,
    messages,
    project?.id,
    status,
    stop,
    handleCopy,
    allModels,
  ]);

  const nonUserMessages = messages.filter((message) => message.role !== 'user');

  useEffect(() => {
    const hasReasoning = messages.some((message) =>
      message.parts.some((part) => part.type === 'reasoning')
    );

    if (hasReasoning && !reasoning.isReasoning && status === 'streaming') {
      setReasoning({ isReasoning: true, isGenerating: true });
    }
  }, [messages, reasoning, status, setReasoning]);

  const handleOutputChange: ChangeEventHandler<HTMLTextAreaElement> =
    useCallback(
      (event) => {
        updateNodeData(id, {
          generated: {
            text: event.target.value,
            sources: data.generated?.sources ?? [],
          }
        });
      },
      [id, data.generated?.sources]
    );

  const outputText = useMemo(() => {
    console.log('Transform - Status:', status);
    console.log('Transform - Messages count:', messages.length);
    console.log('Transform - Non-user messages count:', nonUserMessages.length);
    console.log('Transform - Generated text:', data.generated?.text);

    // During streaming, show messages from the chat
    if (status === 'streaming' && nonUserMessages.length) {
      const text = nonUserMessages
        .map(
          (message) =>
            message.parts.find((part) => part.type === 'text')?.text ?? ''
        )
        .join('\n');
      console.log('Transform - Streaming text:', text);
      return text;
    }
    // After streaming completes, show the saved generated text
    return data.generated?.text ?? '';
  }, [status, nonUserMessages, data.generated?.text, messages]);

  const getPlaceholder = () => {
    if (status === 'submitted') return 'Generating...';
    if (status === 'streaming') return 'Streaming response...';
    if (!outputText) return 'Press ▶ to generate text';
    return '';
  };

  return (
    <NodeLayout id={id} data={data} title={title} type={type} toolbar={toolbar}>
      <Textarea
        value={outputText}
        onChange={handleOutputChange}
        onInput={handleOutputChange}
        onKeyDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        placeholder={getPlaceholder()}
        readOnly={status === 'submitted' || status === 'streaming'}
        className="nowheel h-full min-h-[20rem] flex-1 resize-none rounded-t-3xl rounded-b-none border-none bg-secondary p-4 shadow-none focus-visible:ring-0"
      />
      <Textarea
        value={data.instructions ?? ''}
        onChange={handleInstructionsChange}
        onInput={handleInstructionsChange}
        onKeyDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        placeholder="Enter instructions"
        className="shrink-0 resize-none rounded-none border-none bg-transparent shadow-none focus-visible:ring-0"
      />
      <ReasoningTunnel.In>
        {messages.flatMap((message) =>
          message.parts
            .filter((part) => part.type === 'reasoning')
            .flatMap((part) => part.text ?? '')
        )}
      </ReasoningTunnel.In>
    </NodeLayout>
  );
};
