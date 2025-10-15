# Seletores de Parâmetros de Vídeo

## Resumo

Implementados componentes de seleção para configurar parâmetros específicos de cada modelo de vídeo (duração e aspect ratio) diretamente na toolbar do nó.

## Componentes Criados

### 1. VideoDurationSelector
**Arquivo**: `components/nodes/video/video-duration-selector.tsx`

Permite selecionar a duração do vídeo em segundos.

**Props**:
- `value`: Duração atual (number)
- `options`: Array de durações disponíveis (number[])
- `onChange`: Callback quando a duração muda
- `width`: Largura do componente (padrão: 200px)
- `className`: Classes CSS adicionais

**Características**:
- Ícone de relógio (ClockIcon)
- Label mostra duração + "segundos"
- Usa Combobox do kibo-ui
- Estilo consistente com outros seletores

### 2. VideoAspectRatioSelector
**Arquivo**: `components/nodes/video/video-aspect-ratio-selector.tsx`

Permite selecionar o aspect ratio do vídeo.

**Props**:
- `value`: Aspect ratio atual (string)
- `options`: Array de ratios disponíveis (string[])
- `onChange`: Callback quando o ratio muda
- `width`: Largura do componente (padrão: 200px)
- `className`: Classes CSS adicionais

**Características**:
- Ícones dinâmicos baseados no ratio:
  - `1:1` → SquareIcon
  - `16:9` → RectangleHorizontalIcon
  - `9:16` → RectangleVerticalIcon
- Label mostra o ratio (ex: "16:9")
- Usa Combobox do kibo-ui

## Mudanças nos Tipos

### VideoNodeProps
Adicionados novos campos ao tipo de dados do nó:

```typescript
export type VideoNodeProps = {
  type: string;
  data: {
    // ... campos existentes
    duration?: number;        // ✨ NOVO
    aspectRatio?: string;     // ✨ NOVO
  };
  id: string;
};
```

### TersaVideoModel
Adicionados campos para definir opções disponíveis:

```typescript
export type TersaVideoModel = TersaModel & {
  providers: (TersaProvider & {
    model: VideoModel;
    getCost: ({ duration }: { duration: number }) => number;
  })[];
  enabled?: boolean;
  durations?: number[];      // ✨ NOVO
  aspectRatios?: string[];   // ✨ NOVO
};
```

## Configuração dos Modelos

### Kling Video v2.5 Turbo Pro
```typescript
{
  durations: [5, 10],
  aspectRatios: ['16:9', '9:16', '1:1'],
}
```

### Sora 2 Pro
```typescript
{
  durations: [4, 8, 12],
  aspectRatios: ['16:9', '9:16', '1:1'],
}
```

## Integração no VideoTransform

### Valores Padrão
```typescript
const duration = data.duration ?? selectedModel?.durations?.at(0) ?? 5;
const aspectRatio = data.aspectRatio ?? selectedModel?.aspectRatios?.at(0) ?? '16:9';
```

### Handlers
```typescript
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
```

### Toolbar
Os seletores são adicionados dinamicamente à toolbar se o modelo tiver opções:

```typescript
// Add duration selector if model has duration options
if (selectedModel?.durations?.length) {
  items.push({
    children: (
      <VideoDurationSelector
        value={duration}
        options={selectedModel.durations}
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
        onChange={handleAspectRatioChange}
      />
    ),
  });
}
```

## Mudanças na Action

### GenerateVideoActionProps
Adicionados parâmetros opcionais:

```typescript
type GenerateVideoActionProps = {
  modelId: string;
  prompt: string;
  images: { url: string; type: string }[];
  duration?: number;        // ✨ NOVO
  aspectRatio?: string;     // ✨ NOVO
  nodeId: string;
  projectId: string;
};
```

### Uso dos Parâmetros
```typescript
const url = await provider.model.generate({
  prompt,
  imagePrompt: firstFrameImage,
  duration: duration as 5,
  aspectRatio,
});
```

## Fluxo de Uso

1. **Usuário seleciona modelo** → ModelSelector
2. **Seletores aparecem dinamicamente** baseado nas opções do modelo
3. **Usuário ajusta duração** → VideoDurationSelector
4. **Usuário ajusta aspect ratio** → VideoAspectRatioSelector
5. **Valores são salvos no nó** → updateNodeData
6. **Ao gerar vídeo** → parâmetros são enviados para a API

## Benefícios

### Para o Usuário
- ✅ Controle total sobre duração e formato
- ✅ Interface intuitiva com ícones visuais
- ✅ Valores persistem no nó
- ✅ Seletores aparecem apenas quando relevantes

### Para o Desenvolvedor
- ✅ Código reutilizável e modular
- ✅ Fácil adicionar novos parâmetros
- ✅ Tipo-seguro com TypeScript
- ✅ Consistente com padrões existentes (ImageSizeSelector)

## Exemplo de Uso

### Kling Video v2.5 Turbo Pro
1. Selecionar modelo "Kling Video v2.5 Turbo Pro"
2. Escolher duração: **5s** ou **10s**
3. Escolher aspect ratio: **16:9**, **9:16**, ou **1:1**
4. Gerar vídeo

**Custo**:
- 5s = $0.35
- 10s = $0.70

### Sora 2 Pro
1. Selecionar modelo "Sora 2 Pro"
2. Escolher duração: **4s**, **8s**, ou **12s**
3. Escolher aspect ratio: **16:9**, **9:16**, ou **1:1**
4. Gerar vídeo

**Custo**: $1.20 (fixo)

## Arquivos Modificados

### Novos Arquivos
1. ✅ `components/nodes/video/video-duration-selector.tsx`
2. ✅ `components/nodes/video/video-aspect-ratio-selector.tsx`

### Arquivos Modificados
1. ✅ `components/nodes/video/index.tsx` - Tipos atualizados
2. ✅ `components/nodes/video/transform.tsx` - Seletores integrados
3. ✅ `lib/models/video/index.ts` - Opções adicionadas aos modelos
4. ✅ `app/actions/video/create.ts` - Parâmetros adicionados

## Próximos Passos (Opcional)

### Adicionar Mais Parâmetros
Seguindo o mesmo padrão, é fácil adicionar:
- **Qualidade** (low, medium, high)
- **FPS** (24, 30, 60)
- **Estilo** (realistic, animated, etc)

### Exemplo de Implementação
```typescript
// 1. Criar VideoQualitySelector.tsx
// 2. Adicionar ao tipo:
export type TersaVideoModel = TersaModel & {
  // ... campos existentes
  qualities?: string[];  // ['low', 'medium', 'high']
};

// 3. Adicionar ao toolbar:
if (selectedModel?.qualities?.length) {
  items.push({
    children: (
      <VideoQualitySelector
        value={quality}
        options={selectedModel.qualities}
        onChange={handleQualityChange}
      />
    ),
  });
}
```

## Teste

Para testar a implementação:

1. **Criar nó de vídeo**
2. **Conectar nó de imagem**
3. **Verificar toolbar**:
   - ✅ ModelSelector aparece
   - ✅ VideoDurationSelector aparece
   - ✅ VideoAspectRatioSelector aparece
4. **Mudar modelo**:
   - Kling → opções: 5s, 10s
   - Sora 2 → opções: 4s, 8s, 12s
5. **Selecionar parâmetros diferentes**
6. **Gerar vídeo**
7. **Verificar que os parâmetros foram usados**

## Notas Técnicas

- Os seletores usam o mesmo padrão do `ImageSizeSelector`
- Valores padrão são o primeiro item do array de opções
- Os parâmetros são salvos no nó e persistem entre sessões
- A toolbar é reconstruída quando o modelo muda (useMemo)
- TypeScript garante tipo-segurança em toda a cadeia
