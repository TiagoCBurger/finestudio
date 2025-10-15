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
import { getIncomers, useReactFlow } from '@xyflow/react';
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

export const VideoTransform = ({
  data,
  id,
  type,
  title,
}: VideoTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const [localInstructions, setLocalInstructions] = useState(
    data.instructions ?? ''
  );
  const project = useProject();
  const analytics = useAnalytics();

  const modelId = data.model ?? getDefaultModel(videoModels);
  const selectedModel = videoModels[modelId];
  const duration = data.duration ?? selectedModel?.durations?.at(0) ?? 5;
  const aspectRatio = data.aspectRatio ?? selectedModel?.aspectRatios?.at(0) ?? '16:9';

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

  // Sync local state with external changes
  useEffect(() => {
    if (data.instructions !== undefined && data.instructions !== localInstructions) {
      setLocalInstructions(data.instructions);
    }
  }, [data.instructions]);

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

  const handleGenerate = async () => {
    if (loading || !project?.id) {
      return;
    }

    try {
      const incomers = getIncomers({ id }, getNodes(), getEdges());
      const textPrompts = getTextFromTextNodes(incomers);
      const images = getImagesFromImageNodes(incomers);

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

      const response = await generateVideoAction({
        modelId,
        prompt: [data.instructions ?? '', ...textPrompts].join('\n'),
        images: images.slice(0, 1),
        duration,
        aspectRatio,
        nodeId: id,
        projectId: project.id,
      });

      if ('error' in response) {
        throw new Error(response.error);
      }

      updateNodeData(id, response.nodeData);

      toast.success('Video generated successfully');

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      handleError('Error generating video', error);
    } finally {
      setLoading(false);
    }
  };

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
    if (selectedModel?.aspectRatios?.length) {
      items.push({
        children: (
          <VideoAspectRatioSelector
            value={aspectRatio}
            options={selectedModel.aspectRatios}
            id={`${id}-aspect-ratio`}
            className="w-[120px] rounded-full"
            onChange={handleAspectRatioChange}
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
    selectedModel,
    duration,
    aspectRatio,
    loading,
    data.generated?.url,
    data.updatedAt,
    handleGenerate,
    project?.id,
  ]);

  return (
    <NodeLayout id={id} data={data} type={type} title={title} toolbar={toolbar}>
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
        <video
          src={data.generated.url}
          width={data.width ?? 800}
          height={data.height ?? 450}
          muted
          loop
          playsInline
          onMouseEnter={(e) => e.currentTarget.play()}
          onMouseLeave={(e) => {
            e.currentTarget.pause();
            e.currentTarget.currentTime = 0;
          }}
          className="w-full rounded-b-xl object-cover cursor-pointer"
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
