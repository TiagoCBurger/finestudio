import { generateImageAction } from '@/app/actions/image/create';
import { editImageAction } from '@/app/actions/image/edit';
import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
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
  const [imageLoading, setImageLoading] = useState(false);
  const [previousUrl, setPreviousUrl] = useState(data.generated?.url || '');
  const [shouldShowSuccessToast, setShouldShowSuccessToast] = useState(false);
  const [localInstructions, setLocalInstructions] = useState(
    data.instructions ?? ''
  );
  const [lastErrorUrl, setLastErrorUrl] = useState<string | null>(null);

  const project = useProject();

  // Detectar quando webhook completou via Realtime
  useEffect(() => {
    // Se o data tem flag loading=true, manter loading state
    if ((data as any).loading && !loading) {
      setLoading(true);
    }

    // Se temos uma URL nova e ainda estamos em loading, significa que o webhook completou
    // Agora vamos aguardar a imagem carregar
    const currentUrl = data.generated?.url || '';
    if (loading && currentUrl && currentUrl.length > 0 && currentUrl !== previousUrl) {
      setImageLoading(true);
      setPreviousUrl(currentUrl);
      setShouldShowSuccessToast(true); // Marcar que devemos mostrar toast quando a imagem carregar
      // O loading será removido quando a imagem carregar (onLoad do Image)
    }
  }, [loading, data.generated?.url, id, data.updatedAt, (data as any).loading, previousUrl]);

  // Nota: Removido useFalJob e polling - agora usamos APENAS Supabase Realtime
  // O webhook atualiza o projeto no banco e o Realtime notifica automaticamente via use-project-realtime hook
  // Quando o projeto é atualizado, o componente re-renderiza com os novos dados automaticamente
  const hasIncomingImageNodes =
    getImagesFromImageNodes(getIncomers({ id }, getNodes(), getEdges()))
      .length > 0;
  const modelId = data.model ?? getDefaultModel(imageModels);
  const analytics = useAnalytics();
  const selectedModel = imageModels[modelId];
  const size = data.size ?? selectedModel?.sizes?.at(0);

  const handleGenerate = useCallback(async () => {
    if (loading || !project?.id) {
      return;
    }

    let incomers: any[] = [];
    try {
      incomers = getIncomers({ id }, getNodes(), getEdges());
    } catch (incomersError) {
      console.error('❌ Error getting incomers:', incomersError);
      incomers = [];
    }

    // Garantir que incomers é um array
    if (!Array.isArray(incomers)) {
      console.warn('⚠️ getIncomers did not return an array:', incomers);
      incomers = [];
    }

    // Debug logging para identificar problemas
    console.log('🔍 Debug incomers:', {
      incomersCount: incomers?.length || 0,
      incomers: Array.isArray(incomers) ? incomers.map(node => ({
        id: node?.id || 'unknown',
        type: node?.type || 'unknown',
        hasData: !!node?.data,
        dataKeys: node?.data ? Object.keys(node.data) : []
      })) : []
    });

    let textNodes: string[] = [];
    let imageNodes: any[] = [];
    try {
      textNodes = getTextFromTextNodes(incomers);
      imageNodes = getImagesFromImageNodes(incomers);
    } catch (nodesError) {
      console.error('❌ Error processing nodes:', nodesError);
      textNodes = [];
      imageNodes = [];
    }

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

      if (falRequestId && falStatus === 'pending') {
        // Atualizar o nó com flag de loading
        updateNodeData(id, response.nodeData);
        toast.info('Image generation started...');
        // O Supabase Realtime vai notificar automaticamente quando o webhook atualizar o projeto
      } else {
        // Modo síncrono (sem webhook) - atualizar imediatamente
        updateNodeData(id, response.nodeData);
        setShouldShowSuccessToast(true); // Marcar que devemos mostrar toast quando a imagem carregar
        setLoading(false); // Parar loading apenas no modo síncrono
      }

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      const timestamp = new Date().toISOString();
      console.error(`❌ [${timestamp}] Error in handleGenerate:`, error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));

      // Se o erro for sobre .map(), adicionar contexto extra
      if (error instanceof Error && error.message.includes('map')) {
        console.error('🔍 MAP ERROR DETECTED - This should not happen anymore!');
        console.error('Current state:', {
          loading,
          hasProject: !!project?.id,
          modelId,
          size,
        });
      }

      // 🔧 MELHORIA: Filtrar erros que não devem ser exibidos ao usuário
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Detectar se estamos em modo webhook
      const isWebhookMode = !!process.env.NEXT_PUBLIC_APP_URL;

      // Lista de erros que são falsos positivos em modo webhook
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
        console.warn('⚠️ Suprimindo erro falso positivo em modo webhook:', {
          error: errorMessage,
          nodeId: id,
          projectId: project?.id,
          reason: 'Erro provavelmente relacionado a timing/race condition no webhook'
        });

        // Não exibir toast de erro, apenas parar o loading
        setLoading(false);

        // Exibir toast informativo discreto
        toast.info('Image generation in progress...', {
          description: 'The image will appear automatically when ready',
          duration: 3000 // Toast mais curto
        });

        return; // Não executar handleError
      }

      // Para outros erros, exibir normalmente
      handleError('Error generating image', error);
      setLoading(false);
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
    let enabledModels;
    try {
      enabledModels = getEnabledImageModels();
    } catch (error) {
      console.error('Error getting enabled image models:', error);
      enabledModels = {};
    }

    // Garantir que enabledModels é um objeto válido antes de usar Object.entries
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
      {(loading || imageLoading) && (
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
              {imageLoading ? 'Loading image...' : 'Generating...'}
            </p>
          </div>
        </Skeleton>
      )}
      {!loading && !imageLoading && !data.generated?.url && (
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
      {!loading && !imageLoading && data.generated?.url && (
        <Image
          key={`${data.generated.url}-${data.updatedAt || ''}`} // Force re-render when URL or timestamp changes
          src={data.generated.url}
          alt="Generated image"
          width={1000}
          height={1000}
          className="w-full rounded-b-xl object-cover"
          onLoad={() => {
            console.log('✅ Image loaded successfully:', data.generated?.url);
            setImageLoading(false);
            setLoading(false);
            setLastErrorUrl(null); // Reset error tracking on successful load

            // Só mostrar toast se foi uma nova geração, não um reload da página
            if (shouldShowSuccessToast) {
              toast.success('Image generated successfully');
              setShouldShowSuccessToast(false);
            }
          }}
          onError={(error) => {
            const currentUrl = data.generated?.url || '';

            console.error('❌ Failed to load image:', {
              url: currentUrl,
              error: error,
              timestamp: data.updatedAt,
              isLoading: loading,
              isImageLoading: imageLoading,
              lastErrorUrl
            });

            // 🔧 CORREÇÃO: Evitar toasts duplicados para a mesma URL
            if (lastErrorUrl === currentUrl) {
              console.warn('⚠️ Suprimindo toast duplicado para a mesma URL');
              return;
            }

            // 🔧 CORREÇÃO: Não mostrar erro se estamos em processo de geração
            // A URL antiga pode falhar enquanto aguardamos a nova
            if (loading || imageLoading) {
              console.warn('⚠️ Suprimindo erro durante processo de geração/carregamento');
              return;
            }

            // 🔧 CORREÇÃO: Não mostrar erro se a URL mudou recentemente
            // Isso indica que estamos em transição entre URLs
            if (currentUrl !== previousUrl) {
              console.warn('⚠️ Suprimindo erro durante transição de URL');
              setPreviousUrl(currentUrl);
              return;
            }

            // Marcar que já mostramos erro para esta URL
            setLastErrorUrl(currentUrl);

            // Check if this is a Cloudflare R2 signed URL that might be expired
            const isR2SignedUrl = currentUrl.includes('r2.cloudflarestorage.com') && currentUrl.includes('X-Amz-Signature');

            if (isR2SignedUrl) {
              console.warn('⚠️ R2 signed URL detected - might be expired');
              toast.error('Image URL expired - please regenerate or switch to Supabase storage');
            } else {
              toast.error('Failed to load image - please try regenerating');
            }

            setImageLoading(false);
            setLoading(false);
          }}
          // Add loading state to prevent flash of broken image
          onLoadStart={() => {
            console.log('🔄 Starting to load image:', data.generated?.url);
            setImageLoading(true);
          }}
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
