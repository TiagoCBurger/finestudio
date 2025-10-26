# Como Testar Nano Banana Edit

## O Problema Identificado

Nos logs do servidor, vemos:
```
hasImages: false,
imageCount: 0
```

Isso significa que **nenhum nó de imagem está conectado** ao nó de geração.

## Cenário Correto para Testar Edit Mode

### Setup Necessário

```
┌─────────────┐
│  Imagem 1   │  ← Imagem já gerada (ex: piscina)
│  (origem)   │
└──────┬──────┘
       │
       │ (conectar)
       │
       ▼
┌─────────────┐
│  Imagem 2   │  ← Nó de destino (onde vai gerar)
│  (destino)  │  ← Modelo: 🍌 Nano Banana (Kie.ai)
└──────▲──────┘
       │
       │ (conectar)
       │
┌──────┴──────┐
│   Texto     │  ← Prompt: "adicione uma boia"
└─────────────┘
```

### Passo a Passo

#### 1. Criar Imagem de Origem
- Criar um nó de imagem
- Gerar uma imagem (ex: "gere uma piscina")
- Aguardar completar (status: ready)

#### 2. Criar Nó de Texto
- Criar um nó de texto
- Escrever: "adicione uma boia nessa piscina"

#### 3. Criar Nó de Destino
- Criar outro nó de imagem
- Selecionar modelo: "🍌 Nano Banana (Kie.ai)"

#### 4. Conectar os Nós
- Conectar: **Imagem 1 → Imagem 2** (arrastar da saída da Imagem 1 para entrada da Imagem 2)
- Conectar: **Texto → Imagem 2** (arrastar da saída do Texto para entrada da Imagem 2)

#### 5. Gerar
- Clicar no botão Generate (▶️) no nó Imagem 2
- Verificar logs no console do navegador

## Logs Esperados

### Se APENAS texto conectado (modo atual - ERRADO):
```javascript
🎨 [ImageTransformV2] Preparing generation: {
  imageNodesCount: 0,  // ❌ Sem imagens
  textNodesCount: 1
}
ℹ️ [GenerateImageV2] No images provided, using text-to-image model
📤 [KIE] Sending request to API: { 
  model: "google/nano-banana"  // ❌ Modelo errado
}
```

### Se texto + imagem conectados (modo correto - CERTO):
```javascript
🎨 [ImageTransformV2] Preparing generation: {
  imageNodesCount: 1,  // ✅ 1 imagem conectada
  textNodesCount: 1,
  imageNodes: [{ url: "https://...", type: "image/png" }]
}
🖼️ [ImageTransformV2] Image URLs extracted: {
  count: 1,
  urls: ["https://..."]
}
🔍 [GenerateImageV2] Model configuration check: {
  imageCount: 1  // ✅ Imagem detectada
}
🔄 [GenerateImageV2] Switching to edit model: {
  originalModel: "kie-nano-banana",
  editModel: "google/nano-banana-edit"  // ✅ Modelo correto!
}
🖼️ [KIE] Adding 1 image(s) to edit request: {
  isEditModel: true
}
📤 [KIE] Sending request to API: {
  model: "google/nano-banana-edit",  // ✅ Modelo correto!
  hasImageUrls: true,
  imageUrlsCount: 1
}
```

## Verificação Rápida

### No Console do Navegador

Antes de clicar em Generate, execute:

```javascript
// Pegar o nó de imagem de destino
const nodes = window.__REACT_FLOW_INSTANCE__.getNodes();
const imageNode = nodes.find(n => n.type === 'image' && n.data.model === 'kie-nano-banana');

// Ver nós conectados
const { getIncomers } = await import('@xyflow/react');
const incomers = getIncomers(
  imageNode, 
  window.__REACT_FLOW_INSTANCE__.getNodes(), 
  window.__REACT_FLOW_INSTANCE__.getEdges()
);

console.log('Nós conectados:', incomers.map(n => ({
  type: n.type,
  hasContent: !!n.data.content,
  hasGenerated: !!n.data.generated,
  hasText: !!n.data.text
})));
```

**Resultado esperado**:
```javascript
[
  { type: 'image', hasContent: false, hasGenerated: true },  // Imagem gerada
  { type: 'text', hasContent: false, hasGenerated: false, hasText: true }  // Texto
]
```

## Estrutura dos Nós

### Nó de Imagem com Geração Completa
```typescript
{
  id: "image-1",
  type: "image",
  data: {
    generated: {
      url: "https://pub-fc1a8343fa6d4aa485c79384d30027c5.r2.dev/...",
      type: "image/png"
    },
    state: {
      status: "ready",
      url: "https://...",
      timestamp: "2025-10-26T..."
    }
  }
}
```

### Nó de Texto
```typescript
{
  id: "text-1",
  type: "text",
  data: {
    text: "adicione uma boia nessa piscina"
  }
}
```

### Nó de Imagem Destino (antes de gerar)
```typescript
{
  id: "image-2",
  type: "image",
  data: {
    model: "kie-nano-banana",
    state: {
      status: "idle"
    }
  }
}
```

## Troubleshooting

### Problema: "No input provided"
**Causa**: Nenhum nó conectado
**Solução**: Conectar pelo menos um nó de texto ou imagem

### Problema: imageCount: 0 mas tenho imagem conectada
**Causa**: Nó de imagem não tem `generated` ou `content`
**Solução**: Aguardar imagem completar geração (status: ready)

### Problema: Imagem conectada mas não aparece
**Causa**: Conexão não foi feita corretamente
**Solução**: Deletar edge e reconectar

### Problema: Logs não aparecem no console
**Causa**: Console filtrado ou limpo
**Solução**: 
1. Abrir DevTools (F12)
2. Ir para aba Console
3. Limpar filtros
4. Procurar por "ImageTransformV2" ou "GenerateImageV2"

## Teste Completo

1. ✅ Gerar imagem inicial (piscina)
2. ✅ Aguardar completar
3. ✅ Criar nó de texto
4. ✅ Criar nó de imagem destino
5. ✅ Conectar imagem → destino
6. ✅ Conectar texto → destino
7. ✅ Abrir console do navegador
8. ✅ Clicar em Generate
9. ✅ Verificar logs mostram `imageCount: 1`
10. ✅ Verificar logs mostram `editModel: "google/nano-banana-edit"`
11. ✅ Verificar API recebe `model: "google/nano-banana-edit"`

## Resultado Esperado

A imagem gerada deve ser uma **edição** da imagem original (piscina com boia adicionada), não uma nova imagem do zero.

Se gerar uma imagem completamente nova (sem relação com a original), significa que o modo edit não foi ativado.
