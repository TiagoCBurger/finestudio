/**
 * Image Transform Component (v2)
 * 
 * Refactored component using new state machine architecture.
 * Much simpler than v1 - uses single state from data.state.
 */

'use client';

import { generateImageActionV2 } from '@/app/actions/image/create.v2';
import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { download } from '@/lib/download';
import { imageModels, getEnabledImageModels } from '@/lib/models/image';
import type { ImageNodeState } from '@/lib/models/image/types';
import { shouldShowError } from '@/lib/models/image/types';
import { getImagesFromImageNodes, getTextFromTextNodes } from '@/lib/xyflow';
import { useProject } from '@/providers/project';
import { useQueueMonitorContext } from '@/providers/queue-monitor';
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
import type { ImageNodeProps } from '.';
import { ModelSelector } from '../model-selector';
import { ImageSizeSelector } from './image-size-selector';
import {
    IdlePlaceholder,
    GeneratingSkeleton,
    LoadingImage,
    ReadyImage,
    ErrorDisplay,
} from './states';

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

export const ImageTransformV2 = ({
    data,
    id,
    type,
    title,
}: ImageTransformProps) => {
    const { updateNodeData, getNodes, getEdges } = useReactFlow();
    const [localInstructions, setLocalInstructions] = useState(
        data.instructions ?? ''
    );
    const [isGenerating, setIsGenerating] = useState(false);

    const project = useProject();
    const { addJobOptimistically } = useQueueMonitorContext();
    const analytics = useAnalytics();

    // Get state from data (new state machine)
    const state = (data as any).state as ImageNodeState | undefined;

    // Fallback to idle if no state
    const currentState: ImageNodeState = state || { status: 'idle' };

    // Check if we have incoming image nodes
    const hasIncomingImageNodes =
        getImagesFromImageNodes(getIncomers({ id }, getNodes(), getEdges()))
            .length > 0;

    const modelId = data.model ?? getDefaultModel(imageModels);
    const selectedModel = imageModels[modelId];
    const size = data.size ?? selectedModel?.sizes?.at(0);

    // Show success toast when image loads
    useEffect(() => {
        if (currentState.status === 'ready') {
            // Only show toast if we were previously generating
            // (not on page reload)
            if (isGenerating) {
                toast.success('Image generated successfully');
                setIsGenerating(false);
            }
        }
    }, [currentState.status, isGenerating]);

    // Handle generate button click
    const handleGenerate = useCallback(async () => {
        if (isGenerating || !project?.id) {
            return;
        }

        let incomers: any[] = [];
        try {
            incomers = getIncomers({ id }, getNodes(), getEdges());
        } catch (error) {
            console.error('❌ Error getting incomers:', error);
            incomers = [];
        }

        if (!Array.isArray(incomers)) {
            console.warn('⚠️ getIncomers did not return an array:', incomers);
            incomers = [];
        }

        let textNodes: string[] = [];
        let imageNodes: any[] = [];
        try {
            textNodes = getTextFromTextNodes(incomers);
            imageNodes = getImagesFromImageNodes(incomers);
        } catch (error) {
            console.error('❌ Error processing nodes:', error);
            textNodes = [];
            imageNodes = [];
        }

        try {
            if (!textNodes.length && !imageNodes.length) {
                throw new Error('No input provided');
            }

            setIsGenerating(true);

            // Warn about multiple images
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

            // Call new v2 action
            const result = await generateImageActionV2({
                prompt: textNodes.join('\n'),
                modelId,
                instructions: data.instructions,
                projectId: project.id,
                nodeId: id,
                size,
                images: imageNodes.length > 0 ? imageNodes : undefined,
            });

            console.log('[ImageTransformV2] Generation result:', result);

            if (!result.success) {
                // Handle error
                if (shouldShowError(result.error)) {
                    toast.error(result.error.message, {
                        action: result.error.canRetry
                            ? {
                                label: 'Retry',
                                onClick: handleGenerate,
                            }
                            : undefined,
                    });
                }
                setIsGenerating(false);
                return;
            }

            // Success! State is already updated in the database by the provider
            // Realtime will notify us and component will re-render
            console.log('[ImageTransformV2] Generation started:', result.state);

            // Add job optimistically to queue if we have jobId
            if (result.state.status === 'generating') {
                const jobId = result.state.jobId;
                if (jobId) {
                    addJobOptimistically({
                        id: jobId,
                        requestId: result.state.requestId,
                        userId: project.userId,
                        modelId,
                        type: 'image',
                        status: 'pending',
                        input: {
                            prompt: textNodes.join('\n'),
                            _metadata: {
                                nodeId: id,
                                projectId: project.id,
                            },
                        },
                        result: null,
                        error: null,
                        createdAt: new Date().toISOString(),
                        completedAt: null,
                    });
                }
            }

            // Refresh credits after a delay
            setTimeout(() => mutate('credits'), 5000);
        } catch (error) {
            console.error('❌ Error in handleGenerate:', error);
            toast.error(
                error instanceof Error ? error.message : 'Failed to generate image'
            );
            setIsGenerating(false);
        }
    }, [
        isGenerating,
        project?.id,
        id,
        analytics,
        type,
        data.instructions,
        modelId,
        size,
        getNodes,
        getEdges,
        addJobOptimistically,
    ]);

    // Handle instructions change
    const handleInstructionsChange: ChangeEventHandler<HTMLTextAreaElement> =
        useCallback((event) => {
            setLocalInstructions(event.target.value);
        }, []);

    const handleInstructionsBlur = useCallback(() => {
        if (localInstructions !== data.instructions) {
            updateNodeData(id, { instructions: localInstructions });
        }
    }, [localInstructions, data.instructions, id, updateNodeData]);

    // Sync local state with external changes
    useEffect(() => {
        if (
            data.instructions !== undefined &&
            data.instructions !== localInstructions
        ) {
            setLocalInstructions(data.instructions);
        }
    }, [data.instructions, localInstructions]);

    // Handle model change
    const handleModelChange = useCallback(
        (value: string) => {
            updateNodeData(id, { model: value });
        },
        [id, updateNodeData]
    );

    // Handle size change
    const handleSizeChange = useCallback(
        (value: string) => {
            updateNodeData(id, { size: value });
        },
        [id, updateNodeData]
    );

    // Calculate aspect ratio for display
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

    // Build toolbar
    const toolbar = useMemo<ComponentProps<typeof NodeLayout>['toolbar']>(() => {
        let enabledModels;
        try {
            enabledModels = getEnabledImageModels();
        } catch (error) {
            console.error('Error getting enabled image models:', error);
            enabledModels = {};
        }

        if (!enabledModels || typeof enabledModels !== 'object') {
            console.error('getEnabledImageModels returned invalid data:', enabledModels);
            return [];
        }

        let availableModels;
        try {
            const entries = Object.entries(enabledModels);
            if (!Array.isArray(entries)) {
                console.error('Object.entries did not return array:', entries);
                return [];
            }

            availableModels = Object.fromEntries(
                entries.map(([key, model]) => [
                    key,
                    {
                        ...model,
                        disabled: hasIncomingImageNodes
                            ? !model.supportsEdit
                            : model.disabled,
                    },
                ])
            );
        } catch (error) {
            console.error('Error processing available models:', error);
            return [];
        }

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

        const isLoading =
            currentState.status === 'generating' ||
            currentState.status === 'loading_image';

        items.push(
            isLoading
                ? {
                    tooltip: 'Generating...',
                    children: (
                        <Button size="icon" className="rounded-full" disabled>
                            <Loader2Icon className="animate-spin" size={12} />
                        </Button>
                    ),
                }
                : {
                    tooltip:
                        currentState.status === 'ready' ? 'Regenerate' : 'Generate',
                    children: (
                        <Button
                            size="icon"
                            className="rounded-full"
                            onClick={handleGenerate}
                            disabled={isLoading || !project?.id}
                        >
                            {currentState.status === 'ready' ? (
                                <RotateCcwIcon size={12} />
                            ) : (
                                <PlayIcon size={12} />
                            )}
                        </Button>
                    ),
                }
        );

        if (currentState.status === 'ready') {
            items.push({
                tooltip: 'Download',
                children: (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() =>
                            download({ url: currentState.url, type: 'image/png' }, id, 'png')
                        }
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
        currentState,
        data.updatedAt,
        handleGenerate,
        project?.id,
    ]);

    // Render based on state
    return (
        <NodeLayout id={id} data={data} type={type} title={title} toolbar={toolbar}>
            {currentState.status === 'idle' && (
                <IdlePlaceholder aspectRatio={aspectRatio} />
            )}

            {currentState.status === 'generating' && (
                <GeneratingSkeleton
                    aspectRatio={aspectRatio}
                    requestId={currentState.requestId}
                />
            )}

            {currentState.status === 'loading_image' && (
                <LoadingImage aspectRatio={aspectRatio} />
            )}

            {currentState.status === 'ready' && (
                <ReadyImage
                    url={currentState.url}
                    timestamp={currentState.generatedAt}
                    aspectRatio={aspectRatio}
                />
            )}

            {currentState.status === 'error' && (
                <ErrorDisplay
                    error={currentState.error}
                    canRetry={currentState.canRetry}
                    aspectRatio={aspectRatio}
                    onRetry={handleGenerate}
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
