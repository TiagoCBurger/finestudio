# Solução: Roteamento Nano Banana Edit

## Resumo do Problema

Você está tentando gerar imagens com o modelo `nano-banana-kie` conectando:
- Nó de texto (prompt)
- Nó de imagem (imagem de referência)

**Comportamento esperado**: Quando há imagens conectadas, deve usar `google/nano-banana-edit`
**Comportamento atual**: Parece estar usando `google/nano-banana` (apenas texto)

## O Que Foi Verificado

### ✅ Configuração está correta
- Modelo `kie-nano-banana` tem `supportsEdit: true`
- Tem `providerOptions.kie.editModelId: 'google/nano-banana-edit'`
- Lógica de roteamento está implementada na action

### ✅ Teste unitário passa
- Criei `test-nano-banana-edit-routing.mjs` que confirma a lógica funciona

### ✅ Logs adicionados
Adicionei logs detalhados em 3 pontos para diagnóstico:

1. **Componente** (`components/nodes/image/transform.tsx`):
   - Mostra quantas imagens foram extraídas dos nós conectados
   - Mostra as URLs das imagens

2. **Action** (`app/actions/image/create.ts`):
   - Mostra se há imagens no input
   - Mostra se está trocando para modelo de edição
   - Mostra o modelo efetivo sendo usado

3. **Provider** (`lib/models/image/kie.server.ts`):
   - Mostra se está adicionando imagens à requisição
   - Mostra o payload final enviado para API

## Como Testar Agora

### 1. Iniciar o servidor de desenvolvimento
```bash
pnpm dev
```

### 2. Abrir o console do navegador
- Abrir DevTools (F12)
- Ir para aba Console
- Filtrar por: `GenerateImageV2` ou `KIE` ou `ImageTransformV2`

### 3. Criar o cenário de teste

#### Cenário A: Apenas texto (deve usar nano-banana)
1. Criar nó de texto com prompt: "um gato fofo"
2. Criar nó de imagem
3. Conectar texto → imagem
4. Selecionar modelo "🍌 Nano Banana (Kie.ai)"
5. Clicar em Generate

**Logs esperados**:
```
🎨 [ImageTransformV2] Preparing generation: { imageNodesCount: 0 }
ℹ️ [GenerateImageV2] No images provided, using text-to-image model
📤 [KIE] Sending request to API: { model: "google/nano-banana" }
```

#### Cenário B: Texto + Imagem (deve usar nano-banana-edit)
1. Criar nó de texto com prompt: "transformar em estilo cartoon"
2. Criar nó de imagem e fazer upload de uma imagem OU usar uma imagem já gerada
3. Criar outro nó de imagem (destino)
4. Conectar texto → imagem destino
5. Conectar imagem origem → imagem destino
6. Selecionar modelo "🍌 Nano Banana (Kie.ai)"
7. Clicar em Generate

**Logs esperados**:
```
🎨 [ImageTransformV2] Preparing generation: { imageNodesCount: 1 }
🖼️ [ImageTransformV2] Image URLs extracted: { count: 1, urls: [...] }
🔍 [GenerateImageV2] Model configuration check: { imageCount: 1 }
🔄 [GenerateImageV2] Switching to edit model: { editModel: "google/nano-banana-edit" }
🖼️ [KIE] Adding 1 image(s) to edit request: { isEditModel: true }
📤 [KIE] Sending request to API: { model: "google/nano-banana-edit", hasImageUrls: true }
```

### 4. Analisar os logs

#### Se logs mostram `imageNodesCount: 0` mas você conectou uma imagem:

**Problema**: Imagem não está sendo extraída corretamente

**Possíveis causas**:
1. Nó de imagem não tem `data.content` ou `data.generated`
2. Nó de imagem ainda está carregando (não está no estado `ready`)
3. URL da imagem é inválida

**Como verificar**:
```javascript
// No console do navegador, executar:
const nodes = window.__REACT_FLOW_INSTANCE__.getNodes();
const imageNodes = nodes.filter(n => n.type === 'image');
console.log('Image nodes:', imageNodes.map(n => ({
  id: n.id,
  hasContent: !!n.data.content,
  hasGenerated: !!n.data.generated,
  content: n.data.content,
  generated: n.data.generated
})));
```

#### Se logs mostram `imageCount > 0` mas não troca para edit model:

**Problema**: Configuração do modelo não está sendo lida corretamente

**Como verificar**:
```javascript
// No console do navegador, executar:
import { imageModels } from '@/lib/models/image';
console.log('Nano banana config:', imageModels['kie-nano-banana']);
```

#### Se logs mostram troca para edit model mas API não recebe imagens:

**Problema**: Imagens não estão sendo incluídas no payload da API

**Verificar**: Procurar log `📤 [KIE] Sending request to API` e ver se tem `image_urls`

## Possíveis Soluções

### Solução 1: Nó de imagem não está pronto
Se o nó de imagem conectado ainda está gerando/carregando:

**Aguardar**: Esperar o nó de imagem completar antes de gerar a nova imagem

### Solução 2: Estrutura do nó está incorreta
Se o nó de imagem não tem `content` ou `generated`:

**Verificar**: Como a imagem foi adicionada ao nó? Upload? Geração?

### Solução 3: URLs não são acessíveis
Se as URLs das imagens não são válidas ou acessíveis:

**Verificar**: Tentar abrir a URL da imagem em uma nova aba

### Solução 4: Problema com getImagesFromImageNodes
Se a função não está extraindo as imagens corretamente:

**Debug**: Adicionar log na função:
```typescript
// Em lib/xyflow.ts
export const getImagesFromImageNodes = (nodes: Node[]) => {
  console.log('🔍 getImagesFromImageNodes input:', nodes);
  // ... resto do código
  console.log('🔍 getImagesFromImageNodes output:', [...sourceImages, ...generatedImages]);
  return [...sourceImages, ...generatedImages];
};
```

## Arquivos Modificados

1. `app/actions/image/create.ts` - Logs adicionados
2. `lib/models/image/kie.server.ts` - Logs adicionados
3. `components/nodes/image/transform.tsx` - Logs adicionados

## Arquivos Criados

1. `test-nano-banana-edit-routing.mjs` - Teste unitário
2. `DIAGNOSTICO_NANO_BANANA_EDIT.md` - Guia de diagnóstico
3. `SOLUCAO_NANO_BANANA_EDIT.md` - Este arquivo

## Próximos Passos

1. **Executar teste**: Seguir "Como Testar Agora" acima
2. **Copiar logs**: Copiar todos os logs do console
3. **Analisar**: Verificar qual cenário está acontecendo
4. **Reportar**: Se ainda não funcionar, compartilhar os logs para análise

## Comandos Úteis

```bash
# Teste unitário
node test-nano-banana-edit-routing.mjs

# Iniciar dev server
pnpm dev

# Ver logs em tempo real (filtrar por KIE ou GenerateImageV2)
# No console do navegador
```

## Estrutura de Dados Esperada

### Nó de Imagem (Upload)
```typescript
{
  id: "image-1",
  type: "image",
  data: {
    content: {
      url: "https://storage.url/image.png",
      type: "image/png"
    }
  }
}
```

### Nó de Imagem (Gerada)
```typescript
{
  id: "image-2",
  type: "image",
  data: {
    generated: {
      url: "https://storage.url/generated.png",
      type: "image/png"
    },
    state: {
      status: "ready",
      url: "https://storage.url/generated.png",
      timestamp: "2024-..."
    }
  }
}
```

### Payload API KIE (com imagens)
```json
{
  "model": "google/nano-banana-edit",
  "callBackUrl": "https://app.url/api/webhooks/kie",
  "input": {
    "prompt": "transformar em cartoon",
    "output_format": "png",
    "image_size": "1:1",
    "image_urls": [
      "https://storage.url/image.png"
    ]
  }
}
```

### Payload API KIE (sem imagens)
```json
{
  "model": "google/nano-banana",
  "callBackUrl": "https://app.url/api/webhooks/kie",
  "input": {
    "prompt": "um gato fofo",
    "output_format": "png",
    "image_size": "1:1"
  }
}
```

## Dicas de Debug

### Ver todos os nós no canvas
```javascript
// Console do navegador
const rf = window.__REACT_FLOW_INSTANCE__;
console.log('All nodes:', rf.getNodes());
console.log('All edges:', rf.getEdges());
```

### Ver nós conectados a um nó específico
```javascript
// Console do navegador
import { getIncomers } from '@xyflow/react';
const rf = window.__REACT_FLOW_INSTANCE__;
const nodeId = 'seu-node-id-aqui';
const node = rf.getNode(nodeId);
const incomers = getIncomers(node, rf.getNodes(), rf.getEdges());
console.log('Incomers:', incomers);
```

### Ver imagens extraídas
```javascript
// Console do navegador
import { getImagesFromImageNodes } from '@/lib/xyflow';
const rf = window.__REACT_FLOW_INSTANCE__;
const nodeId = 'seu-node-id-aqui';
const node = rf.getNode(nodeId);
const incomers = getIncomers(node, rf.getNodes(), rf.getEdges());
const images = getImagesFromImageNodes(incomers);
console.log('Images:', images);
```
