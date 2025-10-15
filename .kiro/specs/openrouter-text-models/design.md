# Design Document

## Overview

Implementar integração com OpenRouter para adicionar modelos de texto avançados ao nó de texto, e corrigir o input de texto que não está funcionando. OpenRouter é um gateway unificado que permite acesso a múltiplos modelos de IA através de uma única API.

## Architecture

### Integração OpenRouter

OpenRouter usa o SDK `@ai-sdk/openai` com configuração customizada:

```typescript
import { createOpenAI } from '@ai-sdk/openai';

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});
```

### Modelos OpenRouter (Nomes Corretos da API)

Baseado na documentação do OpenRouter, os IDs corretos dos modelos são:

1. **GPT-4.5 Turbo** - `openai/gpt-5-pro
2. **Claude Sonnet 4** - `anthropic/claude-sonnet-4` 
3. **Gemini 2.5 Pro** - `google/gemini-2.5-pro`
4. **GPT-4o Mini** - `openai/gpt-4o-mini-search-preview`

### Estrutura de Arquivos

```
lib/
├── models/
│   └── text/
│       ├── index.ts          # Registry de modelos de texto
│       └── openrouter.ts     # Provider OpenRouter
├── gateway.tsx               # Gateway existente (manter)
└── env.ts                    # Adicionar OPENROUTER_API_KEY
```

## Components and Interfaces

### 1. Provider OpenRouter (`lib/models/text/openrouter.ts`)

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '@/lib/env';

export const openrouter = env.OPENROUTER_API_KEY
  ? createOpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    })
  : undefined;
```

### 2. Registry de Modelos de Texto (`lib/models/text/index.ts`)

```typescript
import { openrouter } from './openrouter';

export type TextModel = {
  id: string;
  label: string;
  provider: 'openrouter' | 'gateway';
  pricing: {
    input: string;   // custo por 1M tokens
    output: string;  // custo por 1M tokens
  };
  enabled: boolean;
  default?: boolean;
};

export const textModels: Record<string, TextModel> = {
  'openai/gpt-5-pro': {
    id: 'openai/gpt-5-pro',
    label: 'GPT-5',
    provider: 'openrouter',
    pricing: { input: '2.50', output: '10.00' },
    enabled: true,
  },
  'anthropic/claude-sonnet-4': {
    id: 'anthropic/claude-sonnet-4',
    label: 'Claude Sonnet 4',
    provider: 'openrouter',
    pricing: { input: '3.00', output: '15.00' },
    enabled: true,
  },
  'google/gemini-2.5-pro': {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'openrouter',
    pricing: { input: '1.25', output: '5.00' },
    enabled: true,
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'openrouter',
    pricing: { input: '0.15', output: '0.60' },
    enabled: true,
    default: true,
  },
};

export const getEnabledTextModels = () => {
  return Object.fromEntries(
    Object.entries(textModels).filter(([_, model]) => model.enabled)
  );
};
```

### 3. Atualização do Chat Route (`app/api/chat/route.ts`)

Modificar para suportar tanto Gateway quanto OpenRouter:

```typescript
import { openrouter } from '@/lib/models/text/openrouter';
import { textModels } from '@/lib/models/text';

// No handler POST:
const modelConfig = textModels[modelId];

if (!modelConfig) {
  return new Response('Invalid model', { status: 400 });
}

let model;
if (modelConfig.provider === 'openrouter') {
  if (!openrouter) {
    return new Response('OpenRouter not configured', { status: 503 });
  }
  model = openrouter(modelId);
} else {
  // Usar gateway existente
  model = gateway(modelId);
}
```

### 4. Correção do Input de Texto

O problema está no `Textarea` do `transform.tsx`. A classe `bg-transparent!` está incorreta (sintaxe Tailwind inválida).

**Correção:**
```typescript
// De:
className="shrink-0 resize-none rounded-none border-none bg-transparent! shadow-none focus-visible:ring-0"

// Para:
className="shrink-0 resize-none rounded-none border-none bg-transparent shadow-none focus-visible:ring-0"
```

### 5. Atualização do ModelSelector

O `ModelSelector` precisa buscar modelos do novo registry:

```typescript
import { getEnabledTextModels } from '@/lib/models/text';

// No componente TextTransform:
const models = getEnabledTextModels();
```

## Data Models

### TextModel Type
```typescript
type TextModel = {
  id: string;           // ID do modelo na API
  label: string;        // Nome exibido na UI
  provider: string;     // 'openrouter' | 'gateway'
  pricing: {
    input: string;      // Custo por 1M tokens de input
    output: string;     // Custo por 1M tokens de output
  };
  enabled: boolean;     // Se o modelo está ativo
  default?: boolean;    // Se é o modelo padrão
};
```

## Error Handling

1. **OpenRouter não configurado**: Retornar erro 503 com mensagem clara
2. **Modelo inválido**: Retornar erro 400
3. **Erro de autenticação**: Retornar erro 401 com mensagem específica
4. **Erro de API**: Propagar erro do OpenRouter para o usuário

## Testing Strategy

### Testes Manuais

1. **Input de Texto**:
   - Digitar texto no campo de instruções
   - Colar texto
   - Editar texto existente
   - Verificar que o texto é salvo no estado do nó

2. **Modelos OpenRouter**:
   - Abrir seletor de modelos
   - Verificar que os 4 modelos aparecem
   - Selecionar cada modelo
   - Gerar texto com cada modelo
   - Verificar que o custo é calculado corretamente

3. **Fallback sem OpenRouter**:
   - Remover `OPENROUTER_API_KEY` do `.env`
   - Verificar que modelos OpenRouter não aparecem
   - Verificar que modelos do Gateway ainda funcionam

### Verificação de Integração

```typescript
// Script de teste: verify-openrouter.ts
import { openrouter } from '@/lib/models/text/openrouter';
import { textModels } from '@/lib/models/text';

console.log('OpenRouter configured:', !!openrouter);
console.log('Available models:', Object.keys(textModels));
```

## Implementation Notes

- Manter compatibilidade com Gateway existente
- OpenRouter é opcional (funciona sem a chave)
- Usar mesma estrutura de custos dos modelos de imagem/vídeo
- Reutilizar componente `ModelSelector` existente
- Não remover código do Gateway (coexistência)
