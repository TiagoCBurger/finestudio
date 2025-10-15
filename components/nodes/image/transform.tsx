import { generateImageAction } from '@/app/actions/image/create';
import { editImageAction } from '@/app/actions/image/edit';
import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { useFalJob } from '@/hooks/use-fal-job';
import { download } from '@/lib/download';
import { handleError } from '@/lib/error/handle';
import { imageModels, getEnabledImageModels } from '@/lib/models/image';
import { getImagesFromImageNodes, getTextFromTextNodes } from '@/lib/xyflow';
import { useProject } from '@/providers/project';
import { getIncomers, useReactFlow } from '@xyflow/react';
import {
  ClockIcon,
  DownloadIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
} from 'lucide-react';
import Image from 'next/image';
import {
  type ChangeEventHandler,
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import type { ImageNodeProps } from '.';
import { ModelSelector } from '../model-selector';
import { ImageSizeSelector } from './image-size-selector';

type ImageTransformProps = ImageNodeProps & {
  title: string;
};

const getDefaultModel = (models: typeof imageModels) => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => model.default
  );

  if (!defaultModel) {
    throw new Error('No default model found');
  }

  return defaultModel[0];
};

export const ImageTransform = ({
  data,
  id,
  type,
  title,
}: ImageTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const [localInstructions, setLocalInstructions] = useState(
    data.instructions ?? ''
  );
  const [requestId, setRequestId] = useState<string | null>(null);

  // Hook para monitorar job do fal.ai
  const { job, loading: jobLoading, error: jobError } = useFalJob(requestId);
  const project = useProject();

  // Debug: log quando requestId muda
  useEffect(() => {
    console.log('🔑 RequestId changed:', requestId);
    if (requestId) {
      console.log('✅ Starting to monitor job:', requestId);
    }
  }, [requestId]);

  // Atualizar nó quando job completar
  useEffect(() => {
    if (!job) {
      console.log('No job data yet');
      return;
    }

    console.log('🔄 Job status changed:', {
      status: job?.status,
      hasResult: !!job?.result,
      requestId: job?.requestId,
      resultKeys: job?.result ? Object.keys(job.result) : [],
    });

    if (job?.status === 'completed' && job.result) {
      console.log('✅ Fal.ai job completed! Full result:', JSON.stringify(job.result, null, 2));

      // Extrair URL da imagem do resultado
      const imageUrl = job.result.images?.[0]?.url;
      console.log('🖼️ Extracted image URL:', imageUrl);

      if (imageUrl) {
        console.log('🔄 Updating node data with image URL...');

        // Atualizar com o mesmo formato que o modo síncrono
        const newData = {
          ...data,
          generated: {
            url: imageUrl,
            type: 'image/png',
          },
          updatedAt: new Date().toISOString(),
        };

        console.log('📦 New node data:', newData);
        console.log('🚀 Calling updateNodeData...');
        updateNodeData(id, newData);
        console.log('✅ updateNodeData called successfully!');

        toast.success('Image generated successfully via webhook!');
        setRequestId(null); // Limpar request_id
        setLoading(false); // Parar loading
      } else {
        console.error('❌ No image URL found in result:', job.result);
        console.error('Result structure:', JSON.stringify(job.result, null, 2));
      }
    } else if (job?.status === 'failed') {
      console.error('❌ Fal.ai job failed:', job.error);
      toast.error(`Image generation failed: ${job.error}`);
      setRequestId(null); // Limpar request_id
      setLoading(false); // Parar loading
    } else {
      console.log('⏳ Job still pending or no result yet');
    }
  }, [job, id, updateNodeData, data]);
  const hasIncomingImageNodes =
    getImagesFromImageNodes(getIncomers({ id }, getNodes(), getEdges()))
      .length > 0;
  const modelId = data.model ?? getDefaultModel(imageModels);
  const analytics = useAnalytics();
  const selectedModel = imageModels[modelId];
  const size = data.size ?? selectedModel?.sizes?.at(0);

  const handleGenerate = useCallback(async () => {
    if (loading || jobLoading || !project?.id) {
      return;
    }

    const incomers = getIncomers({ id }, getNodes(), getEdges());
    const textNodes = getTextFromTextNodes(incomers);
    const imageNodes = getImagesFromImageNodes(incomers);

    try {
      if (!textNodes.length && !imageNodes.length) {
        throw new Error('No input provided');
      }

      setLoading(true);

      // Aviso para múltiplas imagens
      if (imageNodes.length > 1) {
        toast.info(
          `Using ${imageNodes.length} images. The first image will be used as base.`
        );
      }

      analytics.track('canvas', 'node', 'generate', {
        type,
        textPromptsLength: textNodes.length,
        imagePromptsLength: imageNodes.length,
        model: modelId,
        instructionsLength: data.instructions?.length ?? 0,
      });

      const response = imageNodes.length
        ? await editImageAction({
          images: imageNodes,
          instructions: data.instructions,
          nodeId: id,
          projectId: project.id,
          modelId,
          size,
        })
        : await generateImageAction({
          prompt: textNodes.join('\n'),
          modelId,
          instructions: data.instructions,
          projectId: project.id,
          nodeId: id,
          size,
        });

      console.log('Server Action response:', response);

      if ('error' in response) {
        throw new Error(response.error);
      }

      // Verificar se há request_id nos headers (modo webhook)
      const nodeData = response.nodeData as any;
      const falRequestId = nodeData.generated?.headers?.['x-fal-request-id'];
      const falStatus = nodeData.generated?.headers?.['x-fal-status'];

      console.log('Fal.ai headers:', {
        falRequestId,
        falStatus,
        allHeaders: nodeData.generated?.headers,
      });

      if (falRequestId && falStatus === 'pending') {
        console.log('✅ Fal.ai job submitted, monitoring:', falRequestId);
        setRequestId(falRequestId);
        // NÃO atualizar o nó ainda, aguardar webhook
        // NÃO parar loading, manter até webhook completar
        toast.info('Image generation started, waiting for completion...');
        console.log('⏳ Keeping loading state active, waiting for webhook via Realtime...');

        // O Supabase Realtime vai notificar automaticamente quando o webhook atualizar o projeto
        // Não precisa mais de polling manual!
      } else {
        // Modo síncrono (sem webhook) - atualizar imediatamente
        console.log('Updating node data directly (no webhook)');
        updateNodeData(id, response.nodeData);
        toast.success('Image generated successfully');
        setLoading(false); // Parar loading apenas no modo síncrono
      }

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      handleError('Error generating image', error);
      setLoading(false); // Parar loading apenas em caso de erro
      setRequestId(null); // Limpar requestId em caso de erro
    }
    // NÃO usar finally para não parar loading no modo webhook
  }, [
    loading,
    project?.id,
    size,
    id,
    analytics,
    type,
    data.instructions,
    getEdges,
    modelId,
    getNodes,
    updateNodeData,
  ]);

  const handleInstructionsChange: ChangeEventHandler<HTMLTextAreaElement> =
    useCallback(
      (event) => {
        setLocalInstructions(event.target.value);
      },
      []
    );

  const handleInstructionsBlur = useCallback(() => {
    if (localInstructions !== data.instructions) {
      updateNodeData(id, { instructions: localInstructions });
    }
  }, [localInstructions, data.instructions, id]);

  // Sync local state with external changes
  useEffect(() => {
    if (data.instructions !== undefined && data.instructions !== localInstructions) {
      setLocalInstructions(data.instructions);
    }
  }, [data.instructions]);

  const handleModelChange = useCallback(
    (value: string) => {
      updateNodeData(id, { model: value });
    },
    [id]
  );

  const handleSizeChange = useCallback(
    (value: string) => {
      updateNodeData(id, { size: value });
    },
    [id]
  );

  const toolbar = useMemo<ComponentProps<typeof NodeLayout>['toolbar']>(() => {
    const enabledModels = getEnabledImageModels() || {};
    const availableModels = Object.fromEntries(
      Object.entries(enabledModels).map(([key, model]) => [
        key,
        {
          ...model,
          disabled: hasIncomingImageNodes
            ? !model.supportsEdit
            : model.disabled,
        },
      ])
    );

    const items: ComponentProps<typeof NodeLayout>['toolbar'] = [
      {
        children: (
          <ModelSelector
            value={modelId}
            options={availableModels}
            id={id}
            className="w-[200px] rounded-full"
            onChange={handleModelChange}
          />
        ),
      },
    ];

    if (selectedModel?.sizes?.length) {
      items.push({
        children: (
          <ImageSizeSelector
            value={size ?? ''}
            options={selectedModel?.sizes ?? []}
            id={id}
            className="w-[200px] rounded-full"
            onChange={handleSizeChange}
          />
        ),
      });
    }

    const isGenerating = loading || jobLoading;

    items.push(
      isGenerating
        ? {
          tooltip: jobLoading ? 'Processing via webhook...' : 'Generating...',
          children: (
            <Button size="icon" className="rounded-full" disabled>
              <Loader2Icon className="animate-spin" size={12} />
            </Button>
          ),
        }
        : {
          tooltip: data.generated?.url ? 'Regenerate' : 'Generate',
          children: (
            <Button
              size="icon"
              className="rounded-full"
              onClick={handleGenerate}
              disabled={isGenerating || !project?.id}
            >
              {data.generated?.url ? (
                <RotateCcwIcon size={12} />
              ) : (
                <PlayIcon size={12} />
              )}
            </Button>
          ),
        }
    );

    if (data.generated) {
      items.push({
        tooltip: 'Download',
        children: (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => download(data.generated, id, 'png')}
          >
            <DownloadIcon size={12} />
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
    modelId,
    hasIncomingImageNodes,
    id,
    handleModelChange,
    handleSizeChange,
    selectedModel?.sizes,
    size,
    loading,
    jobLoading,
    data.generated,
    data.updatedAt,
    handleGenerate,
    project?.id,
  ]);

  const aspectRatio = useMemo(() => {
    if (!data.size || typeof data.size !== 'string') {
      return '1/1';
    }

    const parts = data.size.split('x');
    if (parts.length !== 2) {
      return '1/1';
    }

    const [width, height] = parts.map(Number);
    return `${width}/${height}`;
  }, [data.size]);

  return (
    <NodeLayout id={id} data={data} type={type} title={title} toolbar={toolbar}>
      {(loading || jobLoading) && (
        <Skeleton
          className="flex w-full animate-pulse items-center justify-center rounded-b-xl"
          style={{ aspectRatio }}
        >
          <div className="flex flex-col items-center gap-2">
            <Loader2Icon
              size={16}
              className="size-4 animate-spin text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              {jobLoading ? 'Processing...' : 'Generating...'}
            </p>
          </div>
        </Skeleton>
      )}
      {!loading && !jobLoading && !data.generated?.url && (
        <div
          className="flex w-full items-center justify-center rounded-b-xl bg-secondary p-4"
          style={{ aspectRatio }}
        >
          <p className="text-muted-foreground text-sm">
            Press <PlayIcon size={12} className="-translate-y-px inline" /> to
            create an image
          </p>
        </div>
      )}
      {!loading && !jobLoading && data.generated?.url && (
        <Image
          src={data.generated.url}
          alt="Generated image"
          width={1000}
          height={1000}
          className="w-full rounded-b-xl object-cover"
        />
      )}
      <Textarea
        value={localInstructions}
        onChange={handleInstructionsChange}
        onBlur={handleInstructionsBlur}
        placeholder="Enter instructions"
        className="shrink-0 resize-none rounded-none border-none bg-transparent! shadow-none focus-visible:ring-0"
      />
    </NodeLayout>
  );
};
