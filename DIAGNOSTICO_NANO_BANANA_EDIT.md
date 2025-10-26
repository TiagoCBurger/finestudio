# Diagnóstico: Roteamento Nano Banana Edit

## Problema
Quando há imagens conectadas ao nó de imagem, o sistema deveria rotear para `google/nano-banana-edit`, mas parece estar usando `google/nano-banana`.

## Configuração Atual

### ✅ Modelo configurado corretamente
```typescript
// lib/models/image/index.ts
'kie-nano-banana': {
  supportsEdit: true,
  providerOptions: {
    kie: {
      editModelId: 'google/nano-banana-edit',
    },
  },
}
```

### ✅ Lógica de roteamento implementada
```typescript
// app/actions/image/create.ts
if (params.images && params.images.length > 0) {
  if (modelConfig?.supportsEdit && modelConfig.providerOptions?.kie?.editModelId) {
    effectiveModelId = editModelId; // Muda para google/nano-banana-edit
  }
}
```

### ✅ Teste unitário passa
O teste `test-nano-banana-edit-routing.mjs` confirma que a lógica funciona isoladamente.

## Logs Adicionados

Adicionei logs detalhados em 3 pontos:

### 1. Componente (components/nodes/image/transform.tsx)
```
🎨 [ImageTransformV2] Preparing generation
🖼️ [ImageTransformV2] Image URLs extracted
📤 [ImageTransformV2] Calling action with params
```

### 2. Action (app/actions/image/create.ts)
```
🎨 [GenerateImageV2] Starting generation
🔍 [GenerateImageV2] Model configuration check
🔄 [GenerateImageV2] Switching to edit model (quando há imagens)
⚠️ [GenerateImageV2] No edit model configured (quando não há)
ℹ️ [GenerateImageV2] No images provided (quando array vazio)
```

### 3. Provider (lib/models/image/kie.server.ts)
```
🖼️ [KIE] Adding X image(s) to edit/generation request
📋 [KIE] Final API input
📤 [KIE] Sending request to API
```

## Como Testar

### Teste 1: Apenas texto (deve usar nano-banana)
1. Criar nó de texto com prompt
2. Conectar ao nó de imagem
3. Selecionar modelo "🍌 Nano Banana (Kie.ai)"
4. Gerar imagem
5. **Verificar logs**: Deve mostrar `modelId: 'kie-nano-banana'` ou `google/nano-banana`

### Teste 2: Texto + Imagem (deve usar nano-banana-edit)
1. Criar nó de texto com prompt
2. Criar nó de imagem com uma imagem (upload ou gerada)
3. Conectar ambos ao nó de imagem de destino
4. Selecionar modelo "🍌 Nano Banana (Kie.ai)"
5. Gerar imagem
6. **Verificar logs**: Deve mostrar:
   - `🔍 [GenerateImageV2] Model configuration check` com `imageCount > 0`
   - `🔄 [GenerateImageV2] Switching to edit model` com `editModel: 'google/nano-banana-edit'`
   - `🖼️ [KIE] Adding X image(s) to edit request` com `isEditModel: true`

## Possíveis Causas do Problema

### 1. Imagens não estão sendo extraídas
**Sintoma**: Logs mostram `imageCount: 0` mesmo com nó de imagem conectado

**Verificar**:
- O nó de imagem conectado tem `data.content` ou `data.generated`?
- A função `getImagesFromImageNodes` está retornando array vazio?

**Solução**: Verificar estrutura do nó de imagem no console

### 2. Estado do nó de imagem não está pronto
**Sintoma**: Nó de imagem conectado não tem URL disponível

**Verificar**:
- O nó de imagem está no estado `ready`?
- Tem `data.generated.url` ou `data.content.url`?

**Solução**: Aguardar nó de imagem completar geração antes de conectar

### 3. Array de imagens está sendo filtrado
**Sintoma**: Logs mostram imagens sendo extraídas mas chegam vazias na action

**Verificar**:
- URLs das imagens são válidas?
- Não há erro de CORS ou acesso?

**Solução**: Verificar URLs no console

### 4. Modelo não está sendo passado corretamente
**Sintoma**: Logs mostram modelo diferente de `kie-nano-banana`

**Verificar**:
- Qual modelo está selecionado no dropdown?
- O `data.model` do nó está correto?

**Solução**: Verificar seleção do modelo

## Próximos Passos

1. **Executar teste com logs**: Gerar imagem com nó de texto + imagem conectados
2. **Copiar logs do console**: Procurar por `[GenerateImageV2]` e `[KIE]`
3. **Analisar logs**: Verificar se:
   - `imageCount` é maior que 0
   - `effectiveModelId` é `google/nano-banana-edit`
   - API recebe `image_urls` no payload

4. **Se logs mostram roteamento correto mas API não recebe imagens**:
   - Problema está no `prepareApiInput` ou `callKieApi`
   - Verificar se `image_urls` está sendo incluído no body da requisição

5. **Se logs mostram `imageCount: 0`**:
   - Problema está na extração de imagens
   - Verificar estrutura dos nós conectados
   - Verificar se `getImagesFromImageNodes` está funcionando

## Comandos Úteis

```bash
# Executar teste unitário
node test-nano-banana-edit-routing.mjs

# Verificar configuração do modelo
grep -A 10 "kie-nano-banana" lib/models/image/index.ts

# Verificar logs em tempo real (se usando pnpm dev)
# Procurar por: [GenerateImageV2], [KIE], [ImageTransformV2]
```

## Estrutura Esperada

### Nó de Imagem com Conteúdo
```typescript
{
  id: "image-1",
  type: "image",
  data: {
    content: {
      url: "https://...",
      type: "image/png"
    }
  }
}
```

### Nó de Imagem com Geração
```typescript
{
  id: "image-2",
  type: "image",
  data: {
    generated: {
      url: "https://...",
      type: "image/png"
    }
  }
}
```

### Payload Esperado para API KIE (com imagens)
```json
{
  "model": "google/nano-banana-edit",
  "callBackUrl": "https://your-app.com/api/webhooks/kie",
  "input": {
    "prompt": "seu prompt aqui",
    "output_format": "png",
    "image_size": "1:1",
    "image_urls": [
      "https://url-da-imagem-1.png",
      "https://url-da-imagem-2.png"
    ]
  }
}
```

### Payload Esperado para API KIE (sem imagens)
```json
{
  "model": "google/nano-banana",
  "callBackUrl": "https://your-app.com/api/webhooks/kie",
  "input": {
    "prompt": "seu prompt aqui",
    "output_format": "png",
    "image_size": "1:1"
  }
}
```
