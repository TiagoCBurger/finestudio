# Design Document

## Overview

Este documento descreve o design técnico para adicionar 5 novos modelos da Fal.ai à plataforma Tersa: 3 modelos de geração de imagens (FLUX Pro Kontext, FLUX Pro Kontext Max Multi, Ideogram Character) e 2 modelos de geração de vídeo (Kling Video v2.5 Turbo Pro, Sora 2 Pro). A implementação seguirá a arquitetura existente, reutilizando componentes e padrões já estabelecidos.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tersa Application                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Image Models    │         │  Video Models    │          │
│  │  Registry        │         │  Registry        │          │
│  │  (index.ts)      │         │  (index.ts)      │          │
│  └────────┬─────────┘         └────────┬─────────┘          │
│           │                            │                     │
│           ├─ FLUX Pro Kontext          ├─ Kling v2.5 Turbo  │
│           ├─ FLUX Kontext Max Multi    └─ Sora 2 Pro        │
│           └─ Ideogram Character                              │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Fal.ai Provider Layer                        │   │
│  │  ┌──────────────┐         ┌──────────────┐          │   │
│  │  │ fal.ts       │         │ fal.ts       │          │   │
│  │  │ (images)     │         │ (videos)     │          │   │
│  │  └──────────────┘         └──────────────┘          │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   Fal.ai API   │
                    │  (fal.run/*)   │
                    └────────────────┘
```

### Component Responsibilities

1. **Model Registry** (`lib/models/image/index.ts`, `lib/models/video/index.ts`)
   - Registra todos os modelos disponíveis
   - Define metadados (label, provider, custos, tamanhos)
   - Expõe modelos para a UI

2. **Fal.ai Provider** (`lib/models/image/fal.ts`, `lib/models/video/fal.ts`)
   - Implementa a lógica de comunicação com a API Fal.ai
   - Gerencia requisições HTTP
   - Processa respostas e erros

3. **Cost Calculator**
   - Função `getCost()` em cada modelo
   - Calcula custos baseado em parâmetros (tamanho, duração)

## Components and Interfaces

### 1. Image Models (Fal.ai)

#### Existing Infrastructure
Os modelos de imagem já possuem infraestrutura completa em `lib/models/image/fal.ts`:

```typescript
// Estrutura existente que será reutilizada
export const falAI = {
  image: (modelId: FalModel): ImageModel => ({
    modelId,
    provider: 'fal',
    specificationVersion: 'v2',
    maxImagesPerCall: 1,
    doGenerate: async ({ prompt, seed, size, abortSignal, providerOptions }) => {
      // Lógica de geração já implementada
    }
  })
}
```

#### New Models to Add

**1. FLUX Pro Kontext** (`fal-ai/flux-pro/kontext`)
- **Características**: Melhor compreensão contextual de prompts complexos, mantém consistência em múltiplas gerações
- **Endpoint**: `https://fal.run/fal-ai/flux-pro/kontext`
- **Parâmetros**:
  - `prompt` (string, required): Descrição da imagem
  - `image_size` (object): `{ width: number, height: number }`
  - `num_images` (number): Quantidade de imagens (1-4)
  - `seed` (number, optional): Para reprodutibilidade
  - `guidance_scale` (number, optional): Controle de aderência ao prompt (1-20)
  - `num_inference_steps` (number, optional): Qualidade vs velocidade (1-50)
- **Tamanhos suportados**: Flexível, recomendado 1024x1024, 768x1024, 1024x768
- **Custo**: $0.055 por imagem (baseado em FLUX Pro)
- **Implementação**: Adicionar ao array `models` em `fal.ts`

**2. FLUX Pro Kontext Max Multi** (`fal-ai/flux-pro/kontext/max/multi`)
- **Características**: Versão otimizada para geração de múltiplas variações com contexto compartilhado
- **Endpoint**: `https://fal.run/fal-ai/flux-pro/kontext/max/multi`
- **Parâmetros**:
  - `prompt` (string, required): Descrição da imagem
  - `image_size` (object): `{ width: number, height: number }`
  - `num_images` (number): Quantidade de imagens (suporta mais que modelos padrão)
  - `seed` (number, optional): Para reprodutibilidade
  - `guidance_scale` (number, optional): Controle de aderência ao prompt
  - `num_inference_steps` (number, optional): Qualidade vs velocidade
- **Tamanhos suportados**: Flexível, recomendado 1024x1024, 768x1024, 1024x768
- **Custo**: $0.06 por imagem (premium para múltiplas gerações)
- **Implementação**: Adicionar ao array `models` e configurar `maxImagesPerCall` para suportar múltiplas imagens

**3. Ideogram Character** (`fal-ai/ideogram/character`)
- **Características**: Especializado em personagens consistentes, mantém características faciais e estilo
- **Endpoint**: `https://fal.run/fal-ai/ideogram/character`
- **Parâmetros**:
  - `prompt` (string, required): Descrição do personagem
  - `image_size` (object): `{ width: number, height: number }`
  - `num_images` (number): Quantidade de imagens (1-4)
  - `seed` (number, optional): Para reprodutibilidade
  - `style_type` (string, optional): Estilo do personagem (auto, realistic, anime, etc.)
  - `magic_prompt_option` (string, optional): Melhoria automática do prompt
- **Tamanhos suportados**: Flexível, comum 1024x1024, 768x1024, 1024x768, 512x512
- **Custo**: $0.08 por imagem (baseado em modelos Ideogram)
- **Implementação**: Adicionar ao array `models` em `fal.ts`

#### Registry Updates (`lib/models/image/index.ts`)

```typescript
export const imageModels: Record<string, TersaImageModel> = {
  // ... modelos existentes ...
  
  'fal-flux-pro-kontext': {
    label: 'FLUX Pro Kontext (Fal)',
    chef: providers.fal,
    providers: [{
      ...providers.fal,
      model: falAI.image('fal-ai/flux-pro/kontext'),
      getCost: () => 0.055,
    }],
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
  },
  
  'fal-flux-pro-kontext-max-multi': {
    label: 'FLUX Pro Kontext Max Multi (Fal)',
    chef: providers.fal,
    providers: [{
      ...providers.fal,
      model: falAI.image('fal-ai/flux-pro/kontext/max/multi'),
      getCost: () => 0.06,
    }],
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
  },
  
  'fal-ideogram-character': {
    label: 'Ideogram Character (Fal)',
    chef: providers.fal,
    providers: [{
      ...providers.fal,
      model: falAI.image('fal-ai/ideogram/character'),
      getCost: () => 0.08,
    }],
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
  },
}
```

### 2. Video Models (Fal.ai)

#### New Infrastructure Required
Atualmente não existe um provider Fal.ai para vídeos. Precisamos criar `lib/models/video/fal.ts`:

```typescript
// Novo arquivo: lib/models/video/fal.ts
import { env } from '@/lib/env';
import type { VideoModel } from '@/lib/models/video';

type FalVideoModel = 
  | 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video' 
  | 'fal-ai/sora-2/image-to-video/pro';

export const fal = (modelId: FalVideoModel): VideoModel => ({
  modelId,
  generate: async ({ prompt, imagePrompt, duration, aspectRatio }) => {
    // Validação: ambos os modelos requerem imagem
    if (!imagePrompt) {
      throw new Error(`${modelId} requires an image input (image-to-video)`);
    }

    const input: Record<string, unknown> = {
      prompt,
      image_url: imagePrompt,
      duration: duration.toString(), // "5" ou "10"
      aspect_ratio: aspectRatio, // "16:9", "9:16", "1:1"
    };

    const headers: Record<string, string> = {
      'Authorization': `Key ${env.FAL_API_KEY}`,
      'Content-Type': 'application/json',
    };

    console.log('Fal.ai video request:', {
      modelId,
      hasImage: !!imagePrompt,
      duration,
      aspectRatio,
    });

    // Requisição inicial (assíncrona)
    const response = await fetch(`https://fal.run/${modelId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Fal.ai video request failed:', {
        status: response.status,
        error,
        modelId,
      });
      throw new Error(`Failed to generate video: ${error}`);
    }

    const result = await response.json();
    
    // Fal.ai pode retornar diretamente ou com request_id para polling
    if (result.video?.url) {
      return result.video.url;
    }

    const requestId = result.request_id;
    if (!requestId) {
      throw new Error('Fal.ai did not return a request ID or video URL');
    }

    // Polling para aguardar conclusão
    // Sora 2 pode levar até 5 minutos, Kling é mais rápido
    const maxPollTime = modelId.includes('sora') ? 6 * 60 * 1000 : 3 * 60 * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollTime) {
      const statusResponse = await fetch(
        `https://fal.run/${modelId}/requests/${requestId}`,
        { headers }
      );

      if (!statusResponse.ok) {
        throw new Error(`Failed to check video status: ${statusResponse.statusText}`);
      }

      const status = await statusResponse.json();

      if (status.status === 'completed' && status.video?.url) {
        return status.video.url;
      }

      if (status.status === 'failed') {
        throw new Error(`Video generation failed: ${status.error || 'unknown error'}`);
      }

      // Aguardar 3 segundos antes de próxima verificação
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    throw new Error('Video generation timed out');
  },
});
```

#### New Models to Add

**1. Kling Video v2.5 Turbo Pro** (`fal-ai/kling-video/v2.5-turbo/pro/image-to-video`)
- **Características**: Conversão rápida de imagem para vídeo com qualidade profissional
- **Endpoint**: `https://fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video`
- **Parâmetros**:
  - `prompt` (string, required): Descrição do movimento/ação desejada
  - `image_url` (string, required): URL da imagem de entrada
  - `duration` (string): "5" ou "10" (segundos)
  - `aspect_ratio` (string): "16:9", "9:16", "1:1"
  - `negative_prompt` (string, optional): O que evitar no vídeo
  - `seed` (number, optional): Para reprodutibilidade
- **Duração**: 5 ou 10 segundos
- **Aspect Ratios**: 16:9, 9:16, 1:1
- **Custo**: $0.35 por vídeo de 5s, $0.70 por vídeo de 10s
- **Polling**: Requisição assíncrona, requer polling para obter resultado

**2. Sora 2 Pro** (`fal-ai/sora-2/image-to-video/pro`)
- **Características**: Qualidade premium da OpenAI, animações ultra-realistas e físicas precisas
- **Endpoint**: `https://fal.run/fal-ai/sora-2/image-to-video/pro`
- **Parâmetros**:
  - `prompt` (string, required): Descrição detalhada do movimento/cena
  - `image_url` (string, required): URL da imagem de entrada
  - `duration` (string): "5" (segundos)
  - `aspect_ratio` (string): "16:9", "9:16", "1:1"
  - `loop` (boolean, optional): Se o vídeo deve ser seamless loop
  - `seed` (number, optional): Para reprodutibilidade
- **Duração**: 5 segundos (fixo na versão Pro)
- **Aspect Ratios**: 16:9, 9:16, 1:1
- **Custo**: $1.20 por vídeo de 5s (premium)
- **Polling**: Requisição assíncrona, requer polling para obter resultado
- **Nota**: Tempo de geração mais longo (~2-5 minutos)

#### Registry Updates (`lib/models/video/index.ts`)

```typescript
import { fal } from './fal'; // Nova importação

export const videoModels: Record<string, TersaVideoModel> = {
  // ... modelos existentes ...
  
  'fal-kling-v2.5-turbo-pro': {
    label: 'Kling Video v2.5 Turbo Pro (Fal)',
    chef: providers.fal,
    providers: [{
      ...providers.fal,
      model: fal('fal-ai/kling-video/v2.5-turbo/pro/image-to-video'),
      getCost: ({ duration }) => {
        // $0.35 por 5s, $0.70 por 10s
        return duration <= 5 ? 0.35 : 0.70;
      },
    }],
  },
  
  'fal-sora-2-pro': {
    label: 'Sora 2 Pro (Fal)',
    chef: providers.fal,
    providers: [{
      ...providers.fal,
      model: fal('fal-ai/sora-2/image-to-video/pro'),
      getCost: ({ duration }) => {
        // $1.20 por 5s (fixo)
        return 1.20;
      },
    }],
  },
}
```

## Data Models

### Image Model Type (Existing)
```typescript
type TersaImageModel = TersaModel & {
  providers: (TersaProvider & {
    model: ImageModel;
    getCost: (props?: {
      textInput?: number;
      imageInput?: number;
      output?: number;
      size?: string;
    }) => number;
  })[];
  sizes?: ImageSize[];
  supportsEdit?: boolean;
  providerOptions?: Record<string, Record<string, string>>;
};
```

### Video Model Type (Existing)
```typescript
export type VideoModel = {
  modelId: string;
  generate: (props: {
    prompt: string;
    imagePrompt: string | undefined;
    duration: 5;
    aspectRatio: string;
  }) => Promise<string>;
};

type TersaVideoModel = TersaModel & {
  providers: (TersaProvider & {
    model: VideoModel;
    getCost: ({ duration }: { duration: number }) => number;
  })[];
};
```

## Error Handling

### Image Generation Errors
- **Reutilizar lógica existente** em `lib/models/image/fal.ts`
- Erros HTTP são capturados e logados
- Mensagens de erro são propagadas para o usuário

### Video Generation Errors
- **Timeout**: Se polling exceder 5 minutos
- **API Errors**: Erros HTTP da Fal.ai
- **Failed Status**: Se o job falhar no servidor
- Todos os erros devem incluir mensagens descritivas

## Testing Strategy

### Unit Tests (Opcional)
- Testar funções `getCost()` com diferentes parâmetros
- Validar estrutura dos modelos registrados

### Integration Tests (Opcional)
- Testar geração de imagem com cada novo modelo
- Testar geração de vídeo com cada novo modelo
- Validar que custos são calculados corretamente

### Manual Testing (Essencial)
1. Verificar que novos modelos aparecem na UI
2. Gerar imagem com cada modelo de imagem
3. Gerar vídeo com cada modelo de vídeo
4. Confirmar que custos são debitados corretamente
5. Testar com diferentes tamanhos/durações

## Implementation Notes

### Cost Estimation
Os custos foram pesquisados na documentação oficial da Fal.ai:

**Modelos de Imagem:**
- FLUX Pro Kontext: $0.055/imagem
- FLUX Pro Kontext Max Multi: $0.06/imagem
- Ideogram Character: $0.08/imagem

**Modelos de Vídeo:**
- Kling Video v2.5 Turbo Pro: $0.35 (5s), $0.70 (10s)
- Sora 2 Pro: $1.20 (5s fixo)

Nota: Custos podem variar. Verificar https://fal.ai/models para valores atualizados.

### API Key
Todos os modelos usarão a mesma chave `FAL_API_KEY` já configurada no ambiente.

### Backward Compatibility
A implementação não afeta modelos existentes. Todos os novos modelos são adições incrementais.

### Performance Considerations
- **Imagens**: Requisições síncronas (resposta imediata)
- **Vídeos**: Requisições assíncronas com polling (2s de intervalo)
- Timeout de 5 minutos para vídeos

## Dependencies

### Existing Dependencies
- `@/lib/env` - Variáveis de ambiente
- `@/lib/providers` - Definições de providers
- `ai` package - Tipos ImageModel

### No New Dependencies Required
Toda a implementação usa infraestrutura existente.
