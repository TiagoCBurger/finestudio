# Provedores de Modelos AI

Este documento registra todos os modelos de IA que implementamos ou planejamos implementar, organizados por categoria e provedor.

## 📋 Índice

- [🎨 Text-to-Image](#-text-to-image)
- [🖼️ Image-to-Image](#️-image-to-image)
- [🎬 Text-to-Video](#-text-to-video)
- [💬 LLM (Large Language Models)](#-llm-large-language-models)
- [🎵 Audio/Speech](#-audiospeech)
- [📊 Status dos Modelos](#-status-dos-modelos)

---

## 🎨 Text-to-Image

### Fal.ao

### Kie.ai
| Modelo | Status | Custo | Nós Compatíveis | Request Example |
|--------|--------|-------|-----------------|-----------------|
| Nano Banana | ✅ Ativo | $0.03 | `image` | `google/nano-banana` |

---

## 🖼️ Image-to-Image

### Fal.ai
| Modelo | Status | Custo | Nós Compatíveis | Request Example |
|--------|--------|-------|-----------------|-----------------|
| Nano Banana Edit | ✅ Ativo | $2.00 | `image` | `fal-ai/nano-banana/edit` |
| FLUX Dev Image-to-Image | ✅ Ativo | $0.025 | `image` | `fal-ai/flux/dev/image-to-image` |
| GPT Image Edit (BYOK) | ❌ Desabilitado | $0.02 | `image` | `fal-ai/gpt-image-1/edit-image/byok` |

### Kie.ai
| Modelo | Status | Custo | Nós Compatíveis | Request Example |
|--------|--------|-------|-----------------|-----------------|
| Nano Banana Edit | ✅ Ativo | $0.03 | `image` | `google/nano-banana-edit` |

---

## 🎬 Text-to-Video

### Fal.ai
| Modelo | Status | Custo | Durações | Aspect Ratios | Nós Compatíveis | Request Example |
|--------|--------|-------|----------|---------------|-----------------|-----------------|
| Kling Video v2.5 Turbo Pro | ✅ Ativo | $0.35 (5s), $0.70 (10s) | 5s, 10s | 16:9, 9:16, 1:1 | `video` | `fal-ai/kling-video/v2.5-turbo/pro/text-to-video` |
| Sora 2 Pro | ✅ Ativo | $1.20 | 4s, 8s, 12s | 16:9, 9:16, 1:1 | `video` | `fal-ai/sora-2/image-to-video/pro` |
| WAN-25 Preview | ✅ Ativo | $0.50 (5s), $1.00 (10s) | 5s, 10s | 16:9, 9:16, 1:1 | `video` | `fal-ai/wan-25-preview/text-to-video` |

---

## 💬 LLM (Large Language Models)

### OpenRouter
| Modelo | Status | Custo (Input/Output por 1M tokens) | Nós Compatíveis | Request Example |
|--------|--------|-------------------------------------|-----------------|-----------------|
| GPT-5 Pro | ✅ Ativo | $2.50 / $10.00 | `text` | `openai/gpt-5-pro` |
| Claude Sonnet 4 | ✅ Ativo | $3.00 / $15.00 | `text` | `anthropic/claude-sonnet-4` |
| Gemini 2.5 Pro | ✅ Ativo | $1.25 / $5.00 | `text` | `google/gemini-2.5-pro` |
| GPT-4o Mini | ✅ Ativo (Padrão) | $0.15 / $0.60 | `text` | `openai/gpt-4o-mini-search-preview` |

---

## 🎵 Audio/Speech

### Planejados
| Provedor | Modelo | Tipo | Status | Nós Compatíveis |
|----------|--------|------|--------|-----------------|
| OpenAI | TTS-1 | Text-to-Speech | 🔄 Planejado | `audio` |
| OpenAI | Whisper | Speech-to-Text | 🔄 Planejado | `audio` |
| ElevenLabs | Voice Synthesis | Text-to-Speech | 🔄 Planejado | `audio` |

---

## 📊 Status dos Modelos

### Legenda
- ✅ **Ativo**: Modelo implementado e funcionando
- ❌ **Desabilitado**: Modelo implementado mas desabilitado
- 🔄 **Planejado**: Modelo planejado para implementação
- ⚠️ **Em Desenvolvimento**: Modelo em processo de implementação

### Resumo por Provedor

| Provedor | Modelos Ativos | Modelos Desabilitados | Total |
|----------|----------------|----------------------|-------|
| Fal.ai | 8 | 1 | 9 |
| Kie.ai | 2 | 0 | 2 |
| OpenRouter | 4 | 0 | 4 |
| **Total** | **14** | **1** | **15** |

### Estrutura de Arquivos

```
lib/models/
├── image/
│   ├── fal.ts          # Implementação Fal.ai
│   ├── kie.ts          # Implementação Kie.ai
│   └── index.ts        # Configuração dos modelos
├── video/
│   ├── fal.ts          # Implementação Fal.ai
│   └── index.ts        # Configuração dos modelos
├── text/
│   └── index.ts        # Configuração OpenRouter
└── speech/             # 🔄 Planejado
    └── index.ts
```

### Exemplo de Request

#### Image Generation (Fal.ai)
```typescript
const result = await falAI.image('fal-ai/flux-pro/kontext')({
  prompt: "A beautiful landscape",
  image_size: "1024x1024"
});
```

#### Video Generation (Fal.ai)
```typescript
const result = await fal('fal-ai/kling-video/v2.5-turbo/pro/text-to-video')({
  prompt: "A cat playing in the garden",
  duration: 5,
  aspect_ratio: "16:9"
});
```

#### Text Generation (OpenRouter)
```typescript
const result = await openrouter.chat.completions.create({
  model: "openai/gpt-4o-mini-search-preview",
  messages: [{ role: "user", content: "Hello!" }]
});
```

---

## 🔧 Configuração de Novos Modelos

Para adicionar um novo modelo:

1. **Implementar o provedor** em `lib/models/{categoria}/{provedor}.ts`
2. **Configurar o modelo** em `lib/models/{categoria}/index.ts`
3. **Adicionar ícone** em `lib/icons.tsx` (se necessário)
4. **Registrar provedor** em `lib/providers.ts`
5. **Atualizar este documento** com as informações do modelo

### Template de Configuração

```typescript
'novo-modelo': {
  label: 'Nome do Modelo',
  chef: providers.provedor,
  providers: [{
    ...providers.provedor,
    model: provedor.funcao('modelo-id'),
    getCost: () => 0.05,
  }],
  enabled: true,
  default: false,
}
```