import { generateVideoAction } from '@/app/actions/video/create';
import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { download } from '@/lib/download';
import { handleError } from '@/lib/error/handle';
import { videoModels, getEnabledVideoModels } from '@/lib/models/video';
import { getImagesFromImageNodes, getTextFromTextNodes } from '@/lib/xyflow';
import { useProject } from '@/providers/project';
import { getIncomers, useReactFlow, Handle, Position } from '@xyflow/react';
import {
  ClockIcon,
  DownloadIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
} from 'lucide-react';
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
import type { VideoNodeProps } from '.';
import { ModelSelector } from '../model-selector';
import { VideoAspectRatioSelector } from './video-aspect-ratio-selector';
import { VideoDurationSelector } from './video-duration-selector';
import { CfgScaleSlider } from './cfg-scale-slider';

type VideoTransformProps = VideoNodeProps & {
  title: string;
};

const getDefaultModel = (models: typeof videoModels) => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => model.default
  );

  if (!defaultModel) {
    throw new Error('No default model found');
  }

  return defaultModel[0];
};

// Type for node data response from server action
interface NodeDataResponse {
  status?: 'pending' | 'completed';
  requestId?: string;
  generated?: {
    url: string;
    type: string;
  };
  updatedAt?: string;
  loading?: boolean;
}

export const VideoTransform = ({
  data,
  id,
  type,
  title,
}: VideoTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  // 🔧 Inicializar loading baseado no estado persistido no banco
  const [loading, setLoading] = useState((data as any).loading === true || (data as any).status === 'pending');
  const [previousUrl, setPreviousUrl] = useState(data.generated?.url || '');
  const [shouldShowSuccessToast, setShouldShowSuccessToast] = useState(false);
  const [localInstructions, setLocalInstructions] = useState(
    data.instructions ?? ''
  );
  const [videoLoading, setVideoLoading] = useState(false);
  const project = useProject();
  const analytics = useAnalytics();

  const modelId = data.model ?? getDefaultModel(videoModels);
  const selectedModel = videoModels[modelId];
  const duration = data.duration ?? selectedModel?.durations?.at(0) ?? 5;
  const aspectRatio = data.aspectRatio ?? selectedModel?.aspectRatios?.at(0) ?? '16:9';
  const cfgScale = data.cfgScale ?? 0.5;

  // Verificar se é modelo Kling (KIE)
  const isKlingModel = modelId.includes('kling');

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
  }, [localInstructions, data.instructions, id, updateNodeData]);

  const handleCfgScaleChange = useCallback(
    (value: number) => {
      updateNodeData(id, { cfgScale: value });
    },
    [id, updateNodeData]
  );

  // Sync local state with external changes (only when data.instructions changes)
  useEffect(() => {
    if (data.instructions !== undefined && data.instructions !== localInstructions) {
      setLocalInstructions(data.instructions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.instructions]);

  // Sync loading state with database (important for page reloads and multi-window sync)
  useEffect(() => {
    const nodeData = data as NodeDataResponse;
    const shouldBeLoading = nodeData.loading === true || nodeData.status === 'pending';

    // Sync loading state from database
    if (shouldBeLoading && !loading) {
      console.log('[Video Transform] Syncing loading state from database: true');
      setLoading(true);
    }
  }, [(data as any).loading, (data as any).status, loading]);

  // Detect when video generation completes via Realtime
  useEffect(() => {
    // Detect completion: new URL appeared while we're loading
    const currentUrl = data.generated?.url || '';
    if (loading && currentUrl && currentUrl.length > 0 && currentUrl !== previousUrl) {
      console.log('[Video Transform] Video generation completed via Realtime', {
        nodeId: id,
        url: currentUrl.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });

      setLoading(false);
      setPreviousUrl(currentUrl);

      // Only show success toast if this was a new generation
      if (shouldShowSuccessToast) {
        toast.success('Video generated successfully');
        setShouldShowSuccessToast(false);
      }
    }
  }, [loading, data.generated?.url, previousUrl, shouldShowSuccessToast, id]);

  // Polling para verificar se o vídeo foi gerado (fallback se Realtime falhar)
  useEffect(() => {
    if (!loading || !project?.id) {
      return;
    }

    console.log('🔄 Starting polling for video generation:', { nodeId: id });

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}`);
        if (!response.ok) return;

        const updatedProject = await response.json();
        const updatedNode = updatedProject.content?.nodes?.find((n: any) => n.id === id);

        if (updatedNode?.data?.generated?.url) {
          console.log('✅ Polling detected video ready:', {
            nodeId: id,
            url: updatedNode.data.generated.url.substring(0, 50) + '...',
          });

          updateNodeData(id, {
            generated: updatedNode.data.generated,
            loading: false,
            status: 'completed',
            updatedAt: updatedNode.data.updatedAt,
          });

          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, 3000); // Poll a cada 3 segundos (vídeos demoram mais)

    const timeout = setTimeout(() => {
      console.log('⏱️ Polling timeout reached');
      clearInterval(pollInterval);
    }, 10 * 60 * 1000); // 10 minutos para vídeos

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [loading, project?.id, id, updateNodeData]);

  const handleModelChange = useCallback(
    (value: string) => {
      const newModel = videoModels[value];
      const currentDuration = data.duration;

      // Reset duration if current value is not valid for new model
      const needsDurationReset =
        currentDuration &&
        newModel?.durations &&
        !newModel.durations.includes(currentDuration);

      updateNodeData(id, {
        model: value,
        ...(needsDurationReset && newModel.durations && { duration: newModel.durations[0] })
      });
    },
    [id, updateNodeData, data.duration]
  );

  const handleDurationChange = useCallback(
    (value: number) => {
      updateNodeData(id, { duration: value });
    },
    [id, updateNodeData]
  );

  const handleAspectRatioChange = useCallback(
    (value: string) => {
      updateNodeData(id, { aspectRatio: value });
    },
    [id, updateNodeData]
  );

  const handleGenerate = useCallback(async () => {
    if (loading || !project?.id) {
      return;
    }

    let shouldClearLoading = true;

    try {
      const allIncomers = getIncomers({ id }, getNodes(), getEdges());
      const edges = getEdges();

      // Separar incomers por handle
      // IMPORTANTE: Edges sem targetHandle explícito vão para 'prompt' por padrão
      const promptIncomers = allIncomers.filter((node) => {
        const edge = edges.find(
          (e) => e.target === id &&
            e.source === node.id &&
            (e.targetHandle === 'prompt' || e.targetHandle === null || e.targetHandle === undefined)
        );
        return !!edge;
      });

      const negativePromptIncomers = allIncomers.filter((node) => {
        const edge = edges.find(
          (e) => e.target === id &&
            e.source === node.id &&
            e.targetHandle === 'negative-prompt'
        );
        return !!edge;
      });

      const textPrompts = getTextFromTextNodes(promptIncomers);
      const images = getImagesFromImageNodes(promptIncomers);
      const negativePromptTexts = getTextFromTextNodes(negativePromptIncomers);

      // 🔍 DEBUG: Log de conexões
      const targetEdges = edges.filter(e => e.target === id);
      console.log('🔌 [Video Transform] Conexões detectadas:', {
        totalIncomers: allIncomers.length,
        promptIncomers: promptIncomers.length,
        negativePromptIncomers: negativePromptIncomers.length,
        allEdges: targetEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
        })),
        textPrompts: textPrompts.length,
        images: images.length,
        negativePromptTexts: negativePromptTexts.length,
      });

      if (!textPrompts.length && !images.length) {
        throw new Error('No prompts found');
      }

      setLoading(true);

      analytics.track('canvas', 'node', 'generate', {
        type,
        promptLength: textPrompts.join('\n').length,
        model: modelId,
        instructionsLength: data.instructions?.length ?? 0,
        imageCount: images.length,
      });

      // Usar negative prompt dos nós conectados, ou do campo local se não houver conexão
      const finalNegativePrompt = negativePromptTexts.length > 0
        ? negativePromptTexts.join('\n')
        : data.negativePrompt;

      // 🔍 DEBUG: Log do negative prompt final
      console.log('📝 [Video Transform] Negative Prompt:', {
        fromConnectedNodes: negativePromptTexts.length > 0,
        negativePromptTexts,
        finalNegativePrompt,
        hasNegativeConnection: negativePromptIncomers.length > 0,
      });

      const response = await generateVideoAction({
        modelId,
        prompt: [data.instructions ?? '', ...textPrompts].join('\n'),
        images: images.slice(0, 1),
        duration,
        aspectRatio,
        negativePrompt: finalNegativePrompt,
        cfgScale: data.cfgScale,
        nodeId: id,
        projectId: project.id,
      });

      if ('error' in response) {
        throw new Error(response.error);
      }

      // Type-safe check for pending webhook job
      const nodeData = response.nodeData as NodeDataResponse;
      const isPending = nodeData.status === 'pending';

      if (isPending) {
        // ✅ NÃO salvar no banco - apenas manter loading local
        // O webhook vai atualizar o banco quando completar
        // Isso evita flickering causado por Realtime trazendo versão antiga
        shouldClearLoading = false; // Don't clear loading, wait for Realtime
        setShouldShowSuccessToast(true); // Mark that we should show toast on completion

        toast.info('Video generation started, this may take 2-3 minutes...', {
          description: 'The video will appear automatically when ready',
          duration: 5000
        });

        console.log('[Video Transform] Job submitted to webhook queue (local loading only)', {
          nodeId: id,
          projectId: project.id,
          requestId: nodeData.requestId,
          timestamp: new Date().toISOString(),
          note: 'Not saving to DB to avoid flickering'
        });
      } else {
        // Synchronous mode (no webhook) - update immediately
        updateNodeData(id, response.nodeData);
        setShouldShowSuccessToast(true); // Show toast when video loads
      }

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      // Check if this is a false positive error in webhook mode
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isWebhookMode = !!process.env.NEXT_PUBLIC_APP_URL;
      const falsePositiveErrors = [
        'Node not found',
        'Target node',
        'not found in project',
        'Invalid project content structure',
        'Project not found'
      ];

      const isFalsePositiveError = falsePositiveErrors.some(pattern =>
        errorMessage.includes(pattern)
      );

      if (isWebhookMode && isFalsePositiveError) {
        console.warn('[Video Transform] Suppressing false positive error in webhook mode:', {
          error: errorMessage,
          nodeId: id,
          projectId: project?.id,
          reason: 'Likely timing/race condition in webhook'
        });

        toast.info('Video generation in progress...', {
          description: 'The video will appear automatically when ready',
          duration: 3000
        });
      } else {
        handleError('Error generating video', error);
      }
    } finally {
      if (shouldClearLoading) {
        setLoading(false);
      }
    }
  }, [
    loading,
    project?.id,
    id,
    getNodes,
    getEdges,
    analytics,
    type,
    modelId,
    data.instructions,
    data.negativePrompt,
    data.cfgScale,
    duration,
    aspectRatio,
    updateNodeData
  ]);

  const toolbar = useMemo<ComponentProps<typeof NodeLayout>['toolbar']>(() => {
    const enabledModels = getEnabledVideoModels();

    // Validate that we have models and the current model exists
    if (!enabledModels || Object.keys(enabledModels).length === 0) {
      console.error('No enabled video models found');
      return [];
    }

    const items: ComponentProps<typeof NodeLayout>['toolbar'] = [
      {
        children: (
          <ModelSelector
            value={modelId}
            options={enabledModels}
            key={id}
            className="w-[200px] rounded-full"
            onChange={handleModelChange}
          />
        ),
      },
    ];

    // Add duration selector if model has duration options
    if (selectedModel?.durations?.length) {
      items.push({
        children: (
          <VideoDurationSelector
            value={duration}
            options={selectedModel.durations}
            id={`${id}-duration`}
            className="w-[150px] rounded-full"
            onChange={handleDurationChange}
          />
        ),
      });
    }

    // Add aspect ratio selector if model has aspect ratio options
    // Ocultar para Kling image-to-video (quando há imagens conectadas)
    const allIncomers = getIncomers({ id }, getNodes(), getEdges());
    const hasImages = getImagesFromImageNodes(allIncomers).length > 0;
    const shouldShowAspectRatio = selectedModel?.aspectRatios?.length && !(isKlingModel && hasImages);

    if (shouldShowAspectRatio) {
      items.push({
        children: (
          <VideoAspectRatioSelector
            value={aspectRatio}
            options={selectedModel.aspectRatios || []}
            id={`${id}-aspect-ratio`}
            className="w-[120px] rounded-full"
            onChange={handleAspectRatioChange}
          />
        ),
      });
    }

    // Add cfg_scale slider for Kling models
    if (isKlingModel) {
      items.push({
        children: (
          <CfgScaleSlider
            value={cfgScale}
            id={`${id}-cfg-scale`}
            className="w-[200px]"
            onChange={handleCfgScaleChange}
          />
        ),
      });
    }

    items.push(
      loading
        ? {
          tooltip: 'Generating...',
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
              disabled={loading || !project?.id}
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

    if (data.generated?.url) {
      items.push({
        tooltip: 'Download',
        children: (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => {
              if (data.generated) {
                download(data.generated, id, 'mp4');
              }
            }}
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
    id,
    handleModelChange,
    handleDurationChange,
    handleAspectRatioChange,
    handleCfgScaleChange,
    selectedModel,
    duration,
    aspectRatio,
    cfgScale,
    isKlingModel,
    loading,
    data.generated?.url,
    data.updatedAt,
    handleGenerate,
    project?.id,
  ]);

  return (
    <>
      {/* Handle principal para prompt e imagens */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        isConnectable={true}
        style={{
          top: '30%',
          left: 0,
          width: '12px',
          height: '12px',
          border: '2px solid var(--border)',
          zIndex: 10,
          transform: 'translateX(-50%)',
        }}
      />
      <div
        className="absolute left-0 text-xs text-muted-foreground whitespace-nowrap pointer-events-none bg-background/80 px-1 rounded z-50"
        style={{ top: '30%', transform: 'translateX(-100%) translateX(-8px) translateY(-50%)' }}
      >
        Prompt
      </div>

      {/* Handle para negative prompt (apenas para Kling) */}
      {isKlingModel && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="negative-prompt"
            isConnectable={true}
            style={{
              top: '70%',
              left: 0,
              background: '#ef4444',
              width: '12px',
              height: '12px',
              border: '2px solid #dc2626',
              zIndex: 10,
              transform: 'translateX(-50%)',
            }}
          />
          <div
            className="absolute left-0 text-xs text-red-500 whitespace-nowrap pointer-events-none bg-background/80 px-1 rounded font-medium z-50"
            style={{ top: '70%', transform: 'translateX(-100%) translateX(-8px) translateY(-50%)' }}
          >
            Negative
          </div>
        </>
      )}

      <NodeLayout
        id={id}
        data={data}
        type={type}
        title={title}
        toolbar={toolbar}
        disableDefaultHandle={true}
      >
        {loading && (
          <Skeleton className="flex aspect-video w-full animate-pulse items-center justify-center rounded-b-xl">
            <Loader2Icon
              size={16}
              className="size-4 animate-spin text-muted-foreground"
            />
          </Skeleton>
        )}
        {!loading && !data.generated?.url && (
          <div className="flex aspect-video w-full items-center justify-center rounded-b-xl bg-secondary">
            <p className="text-muted-foreground text-sm">
              Press <PlayIcon size={12} className="-translate-y-px inline" /> to
              generate video
            </p>
          </div>
        )}
        {data.generated?.url && !loading && (
          <div className="relative w-full aspect-video">
            {videoLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-b-xl z-10">
                <Loader2Icon
                  size={24}
                  className="animate-spin text-white"
                />
              </div>
            )}
            <video
              src={data.generated.url}
              width={data.width ?? 800}
              height={data.height ?? 450}
              muted
              loop
              playsInline
              onLoadStart={() => setVideoLoading(true)}
              onCanPlay={() => setVideoLoading(false)}
              onError={() => setVideoLoading(false)}
              onMouseEnter={(e) => {
                setVideoLoading(true);
                e.currentTarget.play();
              }}
              onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
                setVideoLoading(false);
              }}
              className="w-full rounded-b-xl object-cover cursor-pointer"
            />
          </div>
        )}
        <Textarea
          value={localInstructions}
          onChange={handleInstructionsChange}
          onInput={handleInstructionsChange}
          onBlur={handleInstructionsBlur}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          placeholder="Enter instructions"
          className="shrink-0 resize-none rounded-none border-none bg-transparent! shadow-none focus-visible:ring-0"
        />
      </NodeLayout>
    </>
  );
};
