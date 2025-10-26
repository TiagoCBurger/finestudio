# 📚 Exemplos de Código - Referência Rápida

## 🎯 Como Usar Este Guia

Este documento contém exemplos práticos de como usar o sistema V2.

## 1️⃣ Criar Novo Provider

### Exemplo: Provider Hipotético "DreamAI"

```typescript
// lib/models/image/dream.server.v2.ts
import { ImageProviderBase } from './provider-base';
import type { ImageGenerationInput } from './types';

export class DreamImageProvider extends ImageProviderBase {
  protected get providerName(): string {
    return 'DREAM';
  }

  protected async submitToExternalAPI(
    input: ImageGenerationInput
  ): Promise<{ requestId: string }> {
    // 1. Preparar input
    const apiInput = {
      prompt: input.prompt,
      width: 1024,
      height: 1024,
      // ... outros parâmetros
    };

    // 2. Chamar API
    const response = await fetch('https://api.dream.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...apiInput,
        webhook_url: this.config.webhookUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`DreamAI API error: ${response.status}`);
    }

    const data = await response.json();

    // 3. Retornar request ID
    return {
      requestId: data.job_id,
    };
  }
}

// Factory function
export function createDreamImageProvider(webhookUrl?: string): DreamImageProvider {
  return new DreamImageProvider({
    apiKey: process.env.DREAM_API_KEY!,
    webhookUrl,
  });
}
```

### Adicionar ao Factory

```typescript
// lib/models/image/provider-factory.ts
import { DreamImageProvider } from './dream.server.v2';

export type ProviderType = 'kie' | 'fal' | 'dream';

function createDreamProvider(): DreamImageProvider {
  const webhookUrl = getWebhookUrl('dream');
  return new DreamImageProvider({
    apiKey: env.DREAM_API_KEY,
    webhookUrl,
  });
}

export function getImageProvider(providerType: ProviderType): ImageProviderBase {
  // ...
  switch (providerType) {
    case 'dream':
      provider = createDreamProvider();
      break;
    // ...
  }
}

export function getProviderByModelId(modelId: string): ImageProviderBase {
  if (modelId.startsWith('dream/')) {
    return getImageProvider('dream');
  }
  // ...
}
```

### Criar Webhook Route

```typescript
// app/api/webhooks/dream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processImageWebhook } from '@/lib/webhooks/image-webhook-handler';
import type { WebhookPayload } from '@/lib/models/image/types';

interface DreamWebhookPayload {
  job_id: string;
  status: 'pending' | 'completed' | 'failed';
  result?: {
    image_url: string;
  };
  error?: string;
}

function normalizeDreamPayload(payload: DreamWebhookPayload): WebhookPayload {
  return {
    requestId: payload.job_id,
    status: payload.status,
    result: payload.result ? {
      images: [{ url: payload.result.image_url }],
    } : undefined,
    error: payload.error,
  };
}

export async function POST(request: NextRequest) {
  const body: DreamWebhookPayload = await request.json();
  const normalized = normalizeDreamPayload(body);
  const result = await processImageWebhook(normalized);
  return NextResponse.json(result);
}
```

## 2️⃣ Adicionar Novo Estado

### Exemplo: Estado "Upscaling"

```typescript
// lib/models/image/types.ts
export type ImageNodeState =
  | { status: 'idle' }
  | { status: 'generating'; requestId: string; jobId: string; modelId: string }
  | { status: 'upscaling'; requestId: string; originalUrl: string } // NOVO
  | { status: 'loading_image'; url: string }
  | { status: 'ready'; url: string; timestamp: string }
  | { status: 'error'; error: ImageGenerationError };
```

### Criar Componente de Estado

```typescript
// components/nodes/image/states/upscaling-state.tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2Icon, ZoomInIcon } from 'lucide-react';

interface UpscalingStateProps {
  aspectRatio: string;
  originalUrl: string;
}

export function UpscalingState({ aspectRatio, originalUrl }: UpscalingStateProps) {
  return (
    <div className="relative">
      {/* Mostrar imagem original com overlay */}
      <img
        src={originalUrl}
        alt="Original"
        className="w-full rounded-b-xl object-cover opacity-50"
      />
      
      {/* Overlay com loading */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-b-xl">
        <div className="flex flex-col items-center gap-2">
          <ZoomInIcon size={24} className="text-white" />
          <Loader2Icon size={16} className="animate-spin text-white" />
          <p className="text-xs text-white">Upscaling...</p>
        </div>
      </div>
    </div>
  );
}
```

### Usar no Componente Principal

```typescript
// components/nodes/image/transform.v2.tsx
import { UpscalingState } from './states/upscaling-state';

const renderState = () => {
  switch (state.status) {
    // ...
    case 'upscaling':
      return (
        <UpscalingState
          aspectRatio={aspectRatio}
          originalUrl={state.originalUrl}
        />
      );
    // ...
  }
};
```

## 3️⃣ Adicionar Validação Customizada

### Exemplo: Validar Tamanho Máximo de Imagem

```typescript
// lib/models/image/dream.server.v2.ts
export class DreamImageProvider extends ImageProviderBase {
  protected validateInput(input: ImageGenerationInput): void {
    // Validação base
    super.validateInput(input);

    // Validação customizada
    if (input.images && input.images.length > 0) {
      // DreamAI suporta apenas 1 imagem
      if (input.images.length > 1) {
        throw new Error('DreamAI supports only 1 image at a time');
      }

      // Verificar tamanho (exemplo)
      const maxSize = 10 * 1024 * 1024; // 10MB
      // ... lógica de verificação
    }

    // Validar prompt length
    if (input.prompt.length > 1000) {
      throw new Error('Prompt must be less than 1000 characters');
    }
  }
}
```

## 4️⃣ Adicionar Retry Automático

### Exemplo: Retry com Exponential Backoff

```typescript
// lib/models/image/provider-base.ts
export abstract class ImageProviderBase {
  protected async submitWithRetry(
    input: ImageGenerationInput,
    maxRetries = 3
  ): Promise<{ requestId: string }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[${this.providerName}] Attempt ${attempt + 1}/${maxRetries}`);
        
        return await this.submitToExternalAPI(input);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(`[${this.providerName}] Attempt ${attempt + 1} failed:`, lastError.message);

        // Não fazer retry no último attempt
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[${this.providerName}] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    // ...
    // Usar submitWithRetry em vez de submitToExternalAPI
    const { requestId } = await this.submitWithRetry(input);
    // ...
  }
}
```

## 5️⃣ Adicionar Telemetria

### Exemplo: Rastrear Tempo de Geração

```typescript
// lib/models/image/provider-base.ts
export abstract class ImageProviderBase {
  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const startTime = Date.now();
    const metrics = {
      provider: this.providerName,
      modelId: input.modelId,
      hasImages: !!input.images?.length,
      imageCount: input.images?.length ?? 0,
    };

    try {
      // ... lógica de geração

      const duration = Date.now() - startTime;
      
      // Enviar métrica de sucesso
      await this.trackMetric('image_generation_success', {
        ...metrics,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Enviar métrica de erro
      await this.trackMetric('image_generation_error', {
        ...metrics,
        duration,
        error: error instanceof Error ? error.message : 'Unknown',
      });

      throw error;
    }
  }

  protected async trackMetric(event: string, data: Record<string, any>): Promise<void> {
    // Implementar integração com seu sistema de analytics
    // Exemplo: PostHog, Mixpanel, Google Analytics, etc.
    console.log(`📊 [Metric] ${event}:`, data);
    
    // Exemplo com PostHog
    // await posthog.capture(event, data);
  }
}
```

## 6️⃣ Adicionar Tratamento de Erro Específico

### Exemplo: Erro de Quota Excedida

```typescript
// lib/models/image/types.ts
export type ImageGenerationError =
  | { type: 'validation'; message: string; canRetry: false }
  | { type: 'api'; message: string; canRetry: true; statusCode?: number }
  | { type: 'quota_exceeded'; message: string; canRetry: false; resetAt?: string } // NOVO
  | { type: 'network'; message: string; canRetry: true }
  // ...
```

### Detectar e Lançar Erro Específico

```typescript
// lib/models/image/dream.server.v2.ts
export class DreamImageProvider extends ImageProviderBase {
  protected async submitToExternalAPI(input: ImageGenerationInput) {
    const response = await fetch('https://api.dream.ai/v1/generate', {
      // ...
    });

    if (response.status === 429) {
      // Quota excedida
      const resetAt = response.headers.get('X-RateLimit-Reset');
      
      throw {
        type: 'quota_exceeded',
        message: 'API quota exceeded. Please try again later.',
        canRetry: false,
        resetAt,
      };
    }

    // ...
  }
}
```

### Mostrar Erro no Componente

```typescript
// components/nodes/image/states/error-display.tsx
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  if (error.type === 'quota_exceeded') {
    return (
      <div className="flex flex-col items-center gap-2 p-4">
        <AlertCircleIcon className="text-orange-500" size={24} />
        <p className="text-sm text-center">{error.message}</p>
        {error.resetAt && (
          <p className="text-xs text-muted-foreground">
            Resets at: {new Date(error.resetAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    );
  }

  // ... outros tipos de erro
}
```

## 7️⃣ Adicionar Progresso de Geração

### Exemplo: Mostrar Progresso (0-100%)

```typescript
// lib/models/image/types.ts
export type ImageNodeState =
  | { status: 'idle' }
  | { status: 'generating'; requestId: string; jobId: string; modelId: string; progress?: number } // NOVO
  // ...
```

### Atualizar Progresso via Webhook

```typescript
// app/api/webhooks/dream/route.ts
interface DreamWebhookPayload {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  // ...
}

export async function POST(request: NextRequest) {
  const body: DreamWebhookPayload = await request.json();

  // Se ainda está processando, atualizar progresso
  if (body.status === 'processing' && body.progress !== undefined) {
    await updateJobProgress(body.job_id, body.progress);
    return NextResponse.json({ message: 'Progress updated' });
  }

  // ... processar normalmente
}

async function updateJobProgress(jobId: string, progress: number) {
  // Atualizar projeto com progresso
  const job = await database.query.falJobs.findFirst({
    where: eq(falJobs.id, jobId),
  });

  if (!job) return;

  const metadata = job.input?._metadata;
  if (!metadata?.nodeId || !metadata?.projectId) return;

  // Atualizar nó com progresso
  await updateNodeState(metadata.projectId, metadata.nodeId, {
    status: 'generating',
    requestId: job.requestId,
    jobId: job.id,
    modelId: job.modelId,
    progress, // NOVO
  });
}
```

### Mostrar Progresso no Componente

```typescript
// components/nodes/image/states/generating-state.tsx
export function GeneratingState({ aspectRatio, requestId, progress }: GeneratingStateProps) {
  return (
    <Skeleton className="flex w-full flex-col items-center justify-center rounded-b-xl" style={{ aspectRatio }}>
      <Loader2Icon size={16} className="animate-spin text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Generating...</p>
      
      {progress !== undefined && (
        <>
          <div className="w-32 h-1 bg-secondary rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{progress}%</p>
        </>
      )}
    </Skeleton>
  );
}
```

## 8️⃣ Adicionar Cache de Resultados

### Exemplo: Cache de Imagens Geradas

```typescript
// lib/models/image/provider-base.ts
export abstract class ImageProviderBase {
  private cache = new Map<string, string>(); // promptHash -> imageUrl

  protected getCacheKey(input: ImageGenerationInput): string {
    // Criar hash do input para usar como chave
    const data = JSON.stringify({
      prompt: input.prompt,
      modelId: input.modelId,
      size: input.size,
      // Não incluir metadata (nodeId, projectId)
    });
    
    // Usar hash simples (em produção, usar crypto.createHash)
    return Buffer.from(data).toString('base64');
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    // Verificar cache
    const cacheKey = this.getCacheKey(input);
    const cachedUrl = this.cache.get(cacheKey);

    if (cachedUrl) {
      console.log(`✅ [${this.providerName}] Cache hit!`);
      
      return {
        state: {
          status: 'ready',
          url: cachedUrl,
          timestamp: new Date().toISOString(),
        },
        nodeData: {
          state: {
            status: 'ready',
            url: cachedUrl,
            timestamp: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        },
      };
    }

    // Gerar normalmente
    const result = await super.generateImage(input);

    // Salvar no cache se sucesso
    if (result.state.status === 'ready') {
      this.cache.set(cacheKey, result.state.url);
    }

    return result;
  }
}
```

## 🎯 Resumo

Estes exemplos mostram como:

1. ✅ Criar novo provider
2. ✅ Adicionar novo estado
3. ✅ Adicionar validação customizada
4. ✅ Implementar retry automático
5. ✅ Adicionar telemetria
6. ✅ Tratar erros específicos
7. ✅ Mostrar progresso
8. ✅ Implementar cache

**Todos seguem o mesmo padrão:** Estender classes base, usar tipos compartilhados, manter lógica centralizada.

---

**Próximo passo:** Ver `COMECE_AQUI.md` para testar o sistema.
