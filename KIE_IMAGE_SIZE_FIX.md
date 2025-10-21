# KIE Image Size Configuration Fix

## Problema Identificado

O modelo KIE nano-banana não estava recebendo corretamente o parâmetro `image_size` selecionado pelo usuário no frontend. O valor estava hardcoded como `'1:1'` independente da seleção do usuário.

## Solução Implementada

### Abordagem: Aspect Ratios Diretos

Ao invés de converter pixels para aspect ratios, o sistema agora usa **aspect ratios diretamente** no frontend e backend, conforme esperado pela API KIE.ai.

### 1. Aspect Ratios no Frontend (`lib/models/image/index.server.ts`)

**Solução**: Configurado o modelo KIE para usar aspect ratios diretamente:

```typescript
const KIE_ASPECT_RATIOS: ImageSize[] = [
    '1:1',    // Quadrado
    '9:16',   // Vertical (stories)
    '16:9',   // Horizontal (widescreen)
    '3:4',    // Vertical (portrait)
    '4:3',    // Horizontal (clássico)
    '3:2',    // Horizontal (fotografia)
    '2:3',    // Vertical (fotografia)
    '5:4',    // Quase quadrado (horizontal)
    '4:5',    // Quase quadrado (vertical)
    '21:9',   // Ultra-wide
    'auto',   // Automático
];
```

### 2. Passagem Direta para API (`lib/models/image/kie.server.ts`)

**Antes**:
```typescript
doGenerate: async ({ prompt, providerOptions }) => {
    const input: KieApiInput = {
        prompt,
        output_format: 'png',
        image_size: '1:1', // ❌ Hardcoded
    };
```

**Depois**:
```typescript
doGenerate: async ({ prompt, size, providerOptions }) => {
    const imageSize = size || '1:1'; // ✅ Usa o valor selecionado
    const input: KieApiInput = {
        prompt,
        output_format: 'png',
        image_size: imageSize, // Passa diretamente (ex: "16:9")
    };
```

### 3. UI Adaptada para Aspect Ratios (`components/nodes/image/image-size-selector.tsx`)

**Solução**: O componente agora detecta e exibe aspect ratios de forma apropriada:

```typescript
const getLabel = (option: string) => {
  const isAspectRatio = option.includes(':');
  
  if (isAspectRatio) {
    // Exibe "16:9" ao invés de "1024 × 576"
    return <span>{option}</span>;
  }
  
  // Para outros modelos, continua exibindo pixels
  const [width, height] = option.split('x').map(Number);
  return <span>{width} × {height}</span>;
};
```

### 4. Suporte a Múltiplas Imagens (`app/actions/image/edit.ts`)

**Problema**: Na edição, o KIE recebia apenas `image` (singular), mas o server espera `images` (array).

**Solução**: Adicionado suporte para ambos os formatos:

```typescript
providerOptions: {
    kie: {
        image: images[0].url,              // Backward compatibility
        images: images.map((img) => img.url), // Array format (correto)
        nodeId,
        projectId,
    },
}
```

## Aspect Ratios Suportados pelo KIE.ai

Segundo a documentação da API KIE, o usuário agora vê e seleciona diretamente:

| Aspect Ratio | Descrição |
|--------------|-----------|
| `1:1`        | Quadrado |
| `9:16`       | Vertical (stories) |
| `16:9`       | Horizontal (widescreen) |
| `3:4`        | Vertical (portrait) |
| `4:3`        | Horizontal (clássico) |
| `3:2`        | Horizontal (fotografia) |
| `2:3`        | Vertical (fotografia) |
| `5:4`        | Quase quadrado (horizontal) |
| `4:5`        | Quase quadrado (vertical) |
| `21:9`       | Ultra-wide |
| `auto`       | Automático |

## Fluxo de Dados Simplificado

1. **Frontend** (`components/nodes/image/transform.tsx`):
   - Usuário seleciona aspect ratio no `ImageSizeSelector`
   - Valor armazenado como `"16:9"` no node data (não mais pixels!)

2. **Action** (`app/actions/image/create.ts` ou `edit.ts`):
   - Recebe `size` como `"16:9"`
   - Passa para `generateImage()` via AI SDK

3. **AI SDK**:
   - Chama `doGenerate()` do provider com `size: "16:9"`

4. **KIE Server** (`lib/models/image/kie.server.ts`):
   - Recebe `size: "16:9"` em `doGenerate()`
   - Passa diretamente para API KIE: `image_size: "16:9"`
   - ✅ Sem conversão necessária!

## Logs de Debug

O sistema inclui logs para rastreamento:

```typescript
console.log('🔍 KIE image_size:', {
    size: imageSize,    // "16:9"
    modelId,            // "google/nano-banana"
});
```

## Testes Recomendados

1. ✅ Selecionar diferentes tamanhos no frontend
2. ✅ Verificar logs do console para conversão correta
3. ✅ Confirmar que a API KIE recebe o aspect ratio correto
4. ✅ Validar que as imagens geradas têm o tamanho esperado
5. ✅ Testar modo geração (sem imagem de entrada)
6. ✅ Testar modo edição (com imagem de entrada)
7. ✅ Testar com múltiplas imagens

## Arquivos Modificados

- ✅ `lib/models/image/kie.server.ts` - Recebimento direto do aspect ratio (backend)
- ✅ `lib/models/image/index.server.ts` - Configuração de aspect ratios para KIE (backend)
- ✅ `lib/models/image/index.ts` - Configuração de aspect ratios para KIE (frontend)
- ✅ `components/nodes/image/image-size-selector.tsx` - UI adaptada para exibir aspect ratios
- ✅ `app/actions/image/edit.ts` - Suporte a array de imagens

## Vantagens da Abordagem

1. **Simplicidade**: Sem conversão de pixels → aspect ratio
2. **Clareza**: Usuário vê exatamente o que a API espera
3. **Flexibilidade**: Suporta `auto` e outros valores especiais
4. **Manutenibilidade**: Menos código, menos bugs
5. **Performance**: Sem cálculos desnecessários

## Status

✅ **Implementado e testado** - O sistema agora:
- Exibe aspect ratios diretamente no seletor (1:1, 16:9, etc)
- Passa o valor selecionado diretamente para a API KIE.ai
- Suporta todos os 11 aspect ratios da documentação KIE
- Mantém compatibilidade com outros modelos que usam pixels
