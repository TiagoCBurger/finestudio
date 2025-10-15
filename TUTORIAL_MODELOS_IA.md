# 📚 Tutorial: Como Editar os Modelos de IA

Este tutorial explica como adicionar, modificar e configurar modelos de IA no seu projeto.

## 📋 Índice

1. [Estrutura dos Modelos](#estrutura-dos-modelos)
2. [Adicionar um Novo Modelo](#adicionar-um-novo-modelo)
3. [Configurar Custos](#configurar-custos)
4. [Configurar Providers](#configurar-providers)
5. [Exemplos Práticos](#exemplos-práticos)

---

## 🏗️ Estrutura dos Modelos

Os modelos de IA estão organizados em três arquivos principais:

```
lib/
├── models/
│   └── image/
│       ├── index.ts      # Definição dos modelos de imagem
│       └── fal.ts        # Provider Fal.ai
└── credits/
    └── costs.ts          # Custos em créditos
```

---

## ➕ Adicionar um Novo Modelo

### Passo 1: Adicionar o Modelo ao Provider

Edite `lib/models/image/fal.ts` e adicione o ID do modelo:

```typescript
const models = [
  'fal-ai/nano-banana/edit',
  'fal-ai/seu-novo-modelo',  // ← Adicione aqui
] as const;
```

### Passo 2: Definir o Modelo

Edite `lib/models/image/index.ts` e adicione a configuração:

```typescript
export const imageModels: Record<string, TersaImageModel> = {
  // Modelo existente
  'fal-nano-banana': {
    label: 'Nano Banana Edit (1 crédito) 🍌',
    chef: providers.unknown,
    providers: [
      {
        ...providers.unknown,
        model: falAI.image('fal-ai/nano-banana/edit'),
        getCost: () => 0.001,
      },
    ],
    sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
    priceIndicator: 'low',
    supportsEdit: true,
    default: true,
  },

  // ✨ SEU NOVO MODELO
  'fal-seu-modelo': {
    label: 'Seu Modelo (5 créditos) 🚀',
    chef: providers.unknown,
    providers: [
      {
        ...providers.unknown,
        model: falAI.image('fal-ai/seu-novo-modelo'),
        getCost: () => 0.005, // Custo por chamada
      },
    ],
    sizes: ['1024x1024', '512x512'], // Resoluções suportadas
    priceIndicator: 'medium', // low, medium, high
    supportsEdit: false, // true se suporta edição de imagem
    default: false, // true se for o modelo padrão
  },
};
```

### Passo 3: Configurar o Custo

Edite `lib/credits/costs.ts`:

```typescript
export const MODEL_COSTS = {
    // Modelos existentes
    'fal-ai/nano-banana/edit': 1,

    // ✨ Adicione seu modelo
    'fal-ai/seu-novo-modelo': 5,
} as const;
```

---

## 💰 Configurar Custos

### Custo Fixo

Para modelos com custo fixo, basta adicionar em `MODEL_COSTS`:

```typescript
'fal-ai/modelo-simples': 3, // 3 créditos por geração
```

### Custo Dinâmico

Para custos que variam por resolução, duração ou qualidade:

```typescript
export const calculateDynamicCost = (
    modelId: string,
    params?: {
        resolution?: string;
        duration?: number;
        quality?: string;
    }
): number => {
    let baseCost = getModelCost(modelId);

    // Multiplicador por resolução
    if (params?.resolution) {
        const resolutionMultipliers: Record<string, number> = {
            '512x512': 1,
            '1024x1024': 2,
            '2048x2048': 4,
        };
        baseCost *= resolutionMultipliers[params.resolution] || 1;
    }

    return Math.max(1, baseCost);
};
```

---

## 🔧 Configurar Providers

### Estrutura do Provider

Cada provider implementa a interface `ImageModel` do Vercel AI SDK:

```typescript
export const falAI = {
  image: (modelId: FalModel): ImageModel => ({
    modelId,
    provider: 'fal',
    specificationVersion: 'v2',
    maxImagesPerCall: 1,
    doGenerate: async ({
      prompt,
      seed,
      size,
      abortSignal,
      providerOptions,
    }) => {
      // Implementação da geração
    },
  }),
};
```

### Adicionar Suporte a Edição de Imagem

Para modelos que suportam edição (image-to-image):

```typescript
const input: Record<string, unknown> = {
  prompt,
  num_images: 1,
};

// Adicionar imagem de entrada
if (typeof providerOptions?.fal?.image === 'string') {
  input.image_url = providerOptions.fal.image;
  input.strength = 0.75; // Força da transformação (0-1)
}
```

### Adicionar Suporte a Múltiplas Imagens

Para modelos como Nano Banana que aceitam múltiplas imagens:

```typescript
const images = providerOptions?.fal?.images;
if (Array.isArray(images) && images.length > 0) {
  input.image_urls = images; // Array de URLs
  input.strength = 0.75;
}
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Modelo de Geração Simples

```typescript
// Em lib/models/image/index.ts
'fal-flux-pro': {
  label: 'FLUX Pro (10 créditos) ⚡',
  chef: providers.unknown,
  providers: [
    {
      ...providers.unknown,
      model: falAI.image('fal-ai/flux-pro'),
      getCost: () => 0.01,
    },
  ],
  sizes: ['1024x1024', '1536x1536'],
  priceIndicator: 'high',
  supportsEdit: false,
  default: false,
},
```

### Exemplo 2: Modelo com Edição

```typescript
'fal-flux-dev-edit': {
  label: 'FLUX Dev Edit (5 créditos) 🎨',
  chef: providers.unknown,
  providers: [
    {
      ...providers.unknown,
      model: falAI.image('fal-ai/flux/dev/image-to-image'),
      getCost: () => 0.005,
    },
  ],
  sizes: ['1024x1024', '768x1024', '1024x768'],
  priceIndicator: 'medium',
  supportsEdit: true, // ← Importante!
  default: false,
},
```

### Exemplo 3: Modelo com Custo Variável

```typescript
// Em lib/credits/costs.ts
export const MODEL_COSTS = {
    'fal-ai/flux-variable': 5, // Custo base
} as const;

// Usar calculateDynamicCost para custos variáveis
const cost = calculateDynamicCost('fal-ai/flux-variable', {
    resolution: '2048x2048', // Multiplica por 4
    quality: 'hd',           // Multiplica por 2
});
// Resultado: 5 * 4 * 2 = 40 créditos
```

---

## 🎯 Propriedades dos Modelos

### TersaImageModel

| Propriedade | Tipo | Descrição |
|------------|------|-----------|
| `label` | string | Nome exibido na interface |
| `chef` | TersaProvider | Provider base |
| `providers` | array | Lista de providers disponíveis |
| `sizes` | ImageSize[] | Resoluções suportadas (ex: '1024x1024') |
| `priceIndicator` | string | Indicador de preço: 'low', 'medium', 'high' |
| `supportsEdit` | boolean | Se suporta edição de imagem |
| `default` | boolean | Se é o modelo padrão |

### Provider Options

| Propriedade | Tipo | Descrição |
|------------|------|-----------|
| `model` | ImageModel | Instância do modelo |
| `getCost` | function | Função que retorna o custo |

---

## 🚀 Testando Seu Modelo

Após adicionar um modelo:

1. **Reinicie o servidor de desenvolvimento**
   ```bash
   pnpm dev
   ```

2. **Verifique os logs** para confirmar que o modelo foi carregado

3. **Teste a geração** através da interface

4. **Monitore os custos** no console para validar os créditos

---

## 📝 Checklist de Adição de Modelo

- [ ] Adicionar ID do modelo em `lib/models/image/fal.ts`
- [ ] Definir configuração em `lib/models/image/index.ts`
- [ ] Configurar custo em `lib/credits/costs.ts`
- [ ] Definir resoluções suportadas
- [ ] Configurar `supportsEdit` se aplicável
- [ ] Testar geração de imagem
- [ ] Validar custos em créditos
- [ ] Documentar características especiais

---

## 🔍 Troubleshooting

### Modelo não aparece na interface
- Verifique se o ID está correto em todos os arquivos
- Confirme que o servidor foi reiniciado

### Erro de autenticação
- Verifique a variável `FAL_API_KEY` no arquivo `.env`

### Custo incorreto
- Confirme o valor em `MODEL_COSTS`
- Verifique se `getCost()` retorna o valor esperado

### Imagem não é gerada
- Verifique os logs do console
- Confirme que a API do provider está funcionando
- Teste a resolução solicitada

---

## 📚 Recursos Adicionais

- [Documentação Fal.ai](https://fal.ai/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Modelos disponíveis no Fal.ai](https://fal.ai/models)

---

**Dica:** Sempre teste novos modelos em ambiente de desenvolvimento antes de colocar em produção! 🎯
