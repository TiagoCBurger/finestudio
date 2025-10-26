/**
 * Componente de Transformação de Imagem (Refatorado)
 * Usa máquina de estados explícita e lógica simplificada
 */

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { useReactFlow, getIncomers } from '@xyflow/react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import {
    PlayIcon,
    RotateCcwIcon,
    DownloadIcon,
    ClockIcon,
    Loader2Icon,
} from 'lucide-react';

import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from '../model-selector';
import { ImageSizeSelector } from './image-size-selector';

import { useProject } from '@/providers/project';
import { useQueueMonitorContext } from '@/providers/queue-monitor';
import { useAnalytics } from '@/hooks/use-analytics';

import { download } from '@/lib/download';
import { handleError } from '@/lib/error/handle';
import { imageModels, getEnabledImageModels } from '@/lib/models/image';
import { getImagesFromImageNodes, getTextFromTextNodes } from '@/lib/xyflow';

import type { ImageNodeProps } from '.';
import type { ImageNodeState } from '@/lib/models/image/types';

// Importar states
import {
    IdleState,
    GeneratingState,
    LoadingImage,
    ReadyState,
    ErrorDisplay,
} from './states';

type ImageTransformV2Props = ImageNodeProps & {
    title: string;
};

const getDefaultModel = (models: typeof imageModels) => {
    const defaultModel = Object.entries(models).find(([_, model]) => model.default);
    if (!defaultModel) {
        throw new Error('No default model found');
    }
    return defaultModel[0];
};

export const ImageTransformV2 = ({ data, id, type, title }: ImageTransformV2Props) => {
    const { updateNodeData, getNodes, getEdges } = useReactFlow();
    const project = useProject();
    const { addJobOptimistically } = useQueueMonitorContext();
    const analytics = useAnalytics();

    // Estado local apenas para UI (não para lógica de negócio)
    const [localInstructions, setLocalInstructions] = useState(data.instructions ?? '');
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Estado vem do data do nó (fonte única de verdade)
    const state: ImageNodeState = (data as any).state ?? { status: 'idle' };

    // Calcular aspect ratio
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

    // Detectar quando webhook completou
    useEffect(() => {
        if (state.status === 'ready' && showSuccessToast) {
            toast.success('Image generated successfully');
            setShowSuccessToast(false);
        }
    }, [state.status, showSuccessToast]);

    // Polling para verificar se a imagem foi gerada (fallback se Realtime falhar)
    useEffect(() => {
        if (state.status !== 'generating' || !project?.id) {
            return;
        }

        console.log('🔄 Starting polling for image generation:', {
            nodeId: id,
            requestId: 'requestId' in state ? state.requestId : undefined,
        });

        const pollInterval = setInterval(async () => {
            try {
                // Buscar projeto atualizado
                const response = await fetch(`/api/projects/${project.id}`);
                if (!response.ok) {
                    // Silenciar erros de CORS/network - Realtime vai lidar com isso
                    return;
                }

                const updatedProject = await response.json();
                const updatedNode = updatedProject.content?.nodes?.find((n: any) => n.id === id);

                if (updatedNode?.data?.state?.status === 'ready') {
                    console.log('✅ Polling detected image ready:', {
                        nodeId: id,
                        url: updatedNode.data.state.url,
                    });

                    // Atualizar nó com novo estado
                    updateNodeData(id, {
                        state: updatedNode.data.state,
                        updatedAt: updatedNode.data.updatedAt,
                    });

                    clearInterval(pollInterval);
                }
            } catch (error) {
                // Silenciar erros de polling - Realtime é o mecanismo principal
                // Polling é apenas fallback
            }
        }, 2000); // Poll a cada 2 segundos

        // Limpar após 5 minutos (timeout)
        const timeout = setTimeout(() => {
            console.log('⏱️ Polling timeout reached');
            clearInterval(pollInterval);
        }, 5 * 60 * 1000);

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeout);
        };
    }, [state.status, project?.id, id, updateNodeData]);

    // Sync local instructions com data (apenas quando data.instructions muda externamente)
    useEffect(() => {
        if (data.instructions !== undefined && data.instructions !== localInstructions) {
            setLocalInstructions(data.instructions);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.instructions]);

    // Handlers
    const handleGenerate = useCallback(async () => {
        // Prevenir duplo clique
        if (state.status === 'generating' || !project?.id || isGenerating) {
            console.log('⏸️ Generation already in progress, ignoring click');
            return;
        }

        setIsGenerating(true);

        try {
            const incomers = getIncomers({ id }, getNodes(), getEdges());
            const textNodes = getTextFromTextNodes(incomers);
            const imageNodes = getImagesFromImageNodes(incomers);

            console.log('🎨 [ImageTransformV2] Preparing generation:', {
                nodeId: id,
                incomersCount: incomers.length,
                textNodesCount: textNodes.length,
                imageNodesCount: imageNodes.length,
                imageNodes: imageNodes,
                modelId: data.model ?? getDefaultModel(imageModels),
            });

            // Permitir geração se houver texto dos nós conectados, imagens conectadas, ou instruções no próprio nó
            if (!textNodes.length && !imageNodes.length && !data.instructions?.trim()) {
                throw new Error('No input provided. Add text nodes, images, or enter instructions.');
            }

            const imageUrls = imageNodes.map(img => img.url);
            console.log('🖼️ [ImageTransformV2] Image URLs extracted:', {
                count: imageUrls.length,
                urls: imageUrls,
            });

            analytics.track('canvas', 'node', 'generate', {
                type,
                textPromptsLength: textNodes.length,
                imagePromptsLength: imageNodes.length,
                model: data.model ?? getDefaultModel(imageModels),
                instructionsLength: data.instructions?.length ?? 0,
            });

            // Importar action dinamicamente
            const { generateImageActionV2 } = await import('@/app/actions/image/create');

            const actionParams = {
                prompt: textNodes.join('\n'),
                images: imageUrls,
                modelId: data.model ?? getDefaultModel(imageModels),
                instructions: data.instructions,
                projectId: project.id,
                nodeId: id,
                size: data.size,
            };

            console.log('📤 [ImageTransformV2] Calling action with params:', {
                ...actionParams,
                prompt: actionParams.prompt.substring(0, 100),
            });

            const response = await generateImageActionV2(actionParams);

            if ('error' in response) {
                throw new Error(response.error);
            }

            // Atualizar nó com novo estado
            updateNodeData(id, response.nodeData);

            // Adicionar job na fila otimisticamente
            if (response.state.status === 'generating') {
                const jobData = {
                    id: response.state.jobId,
                    requestId: response.state.requestId,
                    userId: project.userId,
                    modelId: response.state.modelId,
                    type: 'image' as const,
                    status: 'pending' as const,
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
                };

                console.log('➕ [ImageTransformV2] BEFORE addJobOptimistically:', {
                    jobId: jobData.id,
                    requestId: jobData.requestId,
                    modelId: jobData.modelId,
                    timestamp: new Date().toISOString(),
                });

                addJobOptimistically(jobData);

                console.log('➕ [ImageTransformV2] AFTER addJobOptimistically:', {
                    jobId: jobData.id,
                    timestamp: new Date().toISOString(),
                });

                // Preparar para mostrar toast quando completar
                setShowSuccessToast(true);
            }

            // Atualizar créditos
            setTimeout(() => mutate('credits'), 5000);
        } catch (error) {
            console.error('❌ Error generating image:', error);
            handleError('Error generating image', error);

            // Atualizar nó com estado de erro
            updateNodeData(id, {
                state: {
                    status: 'error',
                    error: {
                        type: 'api',
                        message: error instanceof Error ? error.message : 'Unknown error',
                        canRetry: true,
                    },
                },
            });
        } finally {
            // Sempre limpar a flag, mesmo em caso de erro
            setIsGenerating(false);
        }
    }, [
        state.status,
        project?.id,
        isGenerating,
        id,
        data.model,
        data.instructions,
        data.size,
        type,
        analytics,
        getNodes,
        getEdges,
        updateNodeData,
        addJobOptimistically,
    ]);

    const handleInstructionsChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setLocalInstructions(event.target.value);
        },
        []
    );

    const handleInstructionsBlur = useCallback(() => {
        if (localInstructions !== data.instructions) {
            updateNodeData(id, { instructions: localInstructions });
        }
    }, [localInstructions, data.instructions, id, updateNodeData]);

    const handleModelChange = useCallback(
        (value: string) => {
            updateNodeData(id, { model: value });
        },
        [id, updateNodeData]
    );

    const handleSizeChange = useCallback(
        (value: string) => {
            updateNodeData(id, { size: value });
        },
        [id, updateNodeData]
    );

    // Toolbar
    const hasIncomingImageNodes =
        getImagesFromImageNodes(getIncomers({ id }, getNodes(), getEdges())).length > 0;
    const modelId = data.model ?? getDefaultModel(imageModels);
    const selectedModel = imageModels[modelId];
    const size = data.size ?? selectedModel?.sizes?.at(0);

    const toolbar = useMemo<ComponentProps<typeof NodeLayout>['toolbar']>(() => {
        const enabledModels = getEnabledImageModels();
        const availableModels = Object.fromEntries(
            Object.entries(enabledModels).map(([key, model]) => [
                key,
                {
                    ...model,
                    disabled: hasIncomingImageNodes ? !model.supportsEdit : model.disabled,
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

        items.push(
            state.status === 'generating' || isGenerating
                ? {
                    tooltip: 'Generating...',
                    children: (
                        <Button size="icon" className="rounded-full" disabled>
                            <Loader2Icon className="animate-spin" size={12} />
                        </Button>
                    ),
                }
                : {
                    tooltip: state.status === 'ready' ? 'Regenerate' : 'Generate',
                    children: (
                        <Button
                            size="icon"
                            className="rounded-full"
                            onClick={handleGenerate}
                            disabled={!project?.id || isGenerating}
                        >
                            {state.status === 'ready' ? (
                                <RotateCcwIcon size={12} />
                            ) : (
                                <PlayIcon size={12} />
                            )}
                        </Button>
                    ),
                }
        );

        if (state.status === 'ready') {
            items.push({
                tooltip: 'Download',
                children: (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() =>
                            download({ url: state.url, type: 'image/png' }, id, 'png')
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
        state,
        isGenerating,
        data.updatedAt,
        handleGenerate,
        project?.id,
    ]);

    // Renderizar estado apropriado
    const renderState = () => {
        switch (state.status) {
            case 'idle':
                return <IdleState aspectRatio={aspectRatio} />;

            case 'generating':
                return (
                    <GeneratingState aspectRatio={aspectRatio} requestId={state.requestId} />
                );

            case 'loading_image':
                return <LoadingImage aspectRatio={aspectRatio} />;

            case 'ready':
                return <ReadyState url={state.url} timestamp={state.timestamp} />;

            case 'error':
                return (
                    <ErrorDisplay
                        aspectRatio={aspectRatio}
                        error={state.error}
                        onRetry={state.error?.canRetry ? handleGenerate : undefined}
                    />
                );

            default:
                return <IdleState aspectRatio={aspectRatio} />;
        }
    };

    return (
        <NodeLayout id={id} data={data} type={type} title={title} toolbar={toolbar}>
            {renderState()}
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
    );
};
