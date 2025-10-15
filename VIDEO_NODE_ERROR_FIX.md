# Correção do Erro no Nó de Vídeo

## Problema Identificado

Quando um nó de vídeo tem conexões de entrada, ele muda para o modo `VideoTransform` e apresenta os seguintes erros:

1. **Erro de desestruturação**: "Right side of assignment cannot be destructured"
2. **Erro de aplicação**: "Application error: a client-side exception has occurred"
3. O nó mostra espaço para digitar e uma prévia em cima (comportamento incorreto)

## Causa Raiz

O erro ocorre no componente `ModelSelector` quando tenta calcular o custo dos modelos de vídeo:

```typescript
// ANTES (linha 290 do model-selector.tsx)
{formatCredits(
  model.providers[0]?.getCost?.() ?? 0
)}
```

**Problema**: Os modelos de vídeo têm uma assinatura diferente para `getCost`:
- **Modelos de imagem**: `getCost()` - sem parâmetros
- **Modelos de vídeo**: `getCost({ duration: number })` - requer parâmetro `duration`

Quando o `ModelSelector` tenta chamar `getCost()` sem parâmetros em um modelo de vídeo, ocorre um erro de execução que causa a falha de renderização do componente.

## Solução Implementada

### 1. Correção no ModelSelector

Modificado o `components/nodes/model-selector.tsx` para lidar com ambos os tipos de modelos:

```typescript
{formatCredits(
  (() => {
    try {
      const provider = model.providers[0];
      if (!provider?.getCost) return 0;
      // Try calling with duration parameter for video models
      return provider.getCost({ duration: 5 } as any) ?? 0;
    } catch {
      // Fallback for image models that don't need parameters
      try {
        return model.providers[0]?.getCost?.() ?? 0;
      } catch {
        return 0;
      }
    }
  })()
)}
```

**Lógica**:
1. Primeiro tenta chamar com `{ duration: 5 }` (para modelos de vídeo)
2. Se falhar, tenta chamar sem parâmetros (para modelos de imagem)
3. Se ambos falharem, retorna 0

### 2. Validação no VideoTransform

Adicionado validação no `components/nodes/video/transform.tsx`:

```typescript
const toolbar = useMemo<ComponentProps<typeof NodeLayout>['toolbar']>(() => {
  const enabledModels = getEnabledVideoModels();

  // Validate that we have models and the current model exists
  if (!enabledModels || Object.keys(enabledModels).length === 0) {
    console.error('No enabled video models found');
    return [];
  }

  // ... resto do código
}, [/* dependencies */]);
```

### 3. Melhorias no Carregamento de Providers

Melhorado o tratamento de erros em `lib/models/video/index.ts`:

```typescript
// Provide fallback function
const fallback = () => ({
  modelId: 'error',
  generate: async () => {
    throw new Error('Video provider not properly initialized');
  },
});

try {
  fal = require('./fal').fal;
  // ... outros imports
} catch (error) {
  console.error('Failed to import video providers:', error);
  // Apply fallback functions
  fal = fal || fallback;
  // ... outros fallbacks
}
```

## Como Testar

1. **Criar um nó de vídeo**
2. **Conectar um nó de texto ao nó de vídeo**
3. **Verificar**:
   - ✅ O nó de vídeo deve mostrar o ModelSelector corretamente
   - ✅ Não deve aparecer erro no console
   - ✅ O layout deve estar correto (sem espaços extras)
   - ✅ Deve ser possível selecionar diferentes modelos
   - ✅ Os custos devem aparecer corretamente

## Modelos de Vídeo Habilitados

Após a correção, os seguintes modelos devem estar disponíveis:

- ✅ **Minimax T2V-01-Director** - $0.43
- ✅ **Runway Gen4 Turbo** (default) - $0.50
- ✅ **Fal Kling v2.5 Turbo Pro** - $0.35 (5s) / $0.70 (10s)
- ✅ **Fal Sora 2 Pro** - $1.20 (fixo)

## Arquivos Modificados

1. `components/nodes/model-selector.tsx` - Correção do cálculo de custo
2. `components/nodes/video/transform.tsx` - Validação de modelos
3. `lib/models/video/index.ts` - Melhor tratamento de erros

## Próximos Passos

Se o erro persistir, verificar:

1. **Console do navegador**: Procurar por erros específicos
2. **Network tab**: Verificar se há falhas em requisições
3. **React DevTools**: Verificar o estado dos componentes
4. **Logs do servidor**: Verificar se há erros no lado do servidor

## Notas Técnicas

- O uso de `as any` no TypeScript é necessário porque o tipo `TersaModel` não diferencia entre modelos de imagem e vídeo
- A solução usa try-catch para lidar com as diferentes assinaturas de forma robusta
- O custo padrão de 5 segundos é usado para exibição na UI (pode ser ajustado se necessário)
