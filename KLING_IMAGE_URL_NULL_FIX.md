# Fix: Kling "image_url: none is not an allowed value"

## Problema
Erro ao tentar gerar vídeo com Kling:
```json
{
  "detail": [{
    "loc": ["body", "image_url"],
    "msg": "none is not an allowed value",
    "type": "type_error.none.not_allowed"
  }]
}
```

## Causa Raiz
Havia **dois problemas**:

1. **Lógica de seleção de modelo incorreta**: Quando não havia imagem, o código estava escolhendo o endpoint `image-to-video` (que requer `image_url`) em vez do `text-to-video`

2. **Campo sendo enviado como null**: O código estava enviando `image_url: null` para a API do fal.ai. A API do Kling não aceita `null` - o campo deve ser **omitido completamente** se não houver imagem.

## Solução Implementada

### 1. Corrigir lógica de seleção de modelo
```typescript
// lib/models/video/fal.server.ts
// ❌ ANTES (errado):
const modelId = imagePrompt && textToVideoModelId
    ? imageToVideoModelId
    : !imagePrompt && textToVideoModelId
        ? textToVideoModelId
        : imageToVideoModelId;  // ❌ Sempre cai aqui quando imagePrompt é undefined

// ✅ DEPOIS (correto):
const modelId = imagePrompt
    ? imageToVideoModelId  // Se tem imagem, usa image-to-video
    : textToVideoModelId || imageToVideoModelId;  // Se não tem, usa text-to-video
```

### 2. Garantir que imagePrompt seja undefined, não null
```typescript
// app/actions/video/create.ts
const url = await provider.model.generate({
  prompt,
  imagePrompt: firstFrameImage || undefined, // Garantir undefined, não null
  duration: duration as 5,
  aspectRatio,
});
```

### 2. Validação mais rigorosa antes de adicionar ao input
```typescript
// lib/models/video/fal.server.ts
// Adicionar image_url apenas se houver imagem válida
if (imagePrompt && typeof imagePrompt === 'string' && imagePrompt.trim() !== '') {
  input.image_url = imagePrompt;
} else {
  // NÃO adicionar o campo se não houver imagem
  console.log('ℹ️ No image URL provided, using text-to-video mode');
}
```

### 3. Logs melhorados para debug
```typescript
console.log('🎬 Fal.ai video queue request:', {
  modelId,
  hasImage: !!imagePrompt,
  inputKeys: Object.keys(input),
  fullInput: JSON.stringify(input, null, 2),
});
```

## Diferença

### ❌ Antes (Errado):
```json
{
  "prompt": "A beautiful sunset",
  "duration": 5,
  "aspect_ratio": "16:9",
  "image_url": null  // ❌ Causa erro 422
}
```

### ✅ Depois (Correto):
```json
{
  "prompt": "A beautiful sunset",
  "duration": 5,
  "aspect_ratio": "16:9"
  // ✅ Campo image_url omitido completamente
}
```

## Modelos Afetados

### Kling Video
- **Image-to-Video**: `fal-ai/kling-video/v2.5-turbo/pro/image-to-video`
  - Requer `image_url` (obrigatório)
  - Não aceita `null`
  
- **Text-to-Video**: `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`
  - NÃO deve ter `image_url`
  - Campo deve ser omitido

### Sora 2
- **Image-to-Video**: `fal-ai/sora-2/image-to-video/pro`
  - Requer `image_url` (obrigatório)
  - Não aceita `null`

## Como Usar Corretamente

### Text-to-Video (sem imagem):
1. Crie um nó de texto com o prompt
2. Conecte ao nó de vídeo (Kling Text-to-Video)
3. Configure duração e aspect ratio
4. Gere o vídeo

### Image-to-Video (com imagem):
1. Crie/conecte um nó de imagem
2. Conecte ao nó de vídeo (Kling Image-to-Video)
3. Adicione prompt (opcional, para guiar a animação)
4. Configure duração e aspect ratio
5. Gere o vídeo

## Validação Automática

O código agora valida automaticamente:

```typescript
// Se não tem textToVideoModelId, imagem é obrigatória
if (!imagePrompt && !textToVideoModelId) {
  throw new Error(`${modelId} requires an image input (image-to-video)`);
}
```

## Logs para Debug

Após a correção, os logs mostrarão:

### Com imagem:
```
✅ Image URL added to input: https://...
🎬 Fal.ai video queue request: {
  modelId: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
  hasImage: true,
  inputKeys: ['prompt', 'duration', 'aspect_ratio', 'image_url']
}
```

### Sem imagem:
```
ℹ️ No image URL provided, using text-to-video mode
🎬 Fal.ai video queue request: {
  modelId: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
  hasImage: false,
  inputKeys: ['prompt', 'duration', 'aspect_ratio']
}
```

## Teste

1. **Reinicie o servidor:**
```bash
pnpm dev
```

2. **Teste Text-to-Video:**
   - Crie nó de texto
   - Conecte a Kling Text-to-Video
   - Gere vídeo
   - ✅ Deve funcionar sem erro

3. **Teste Image-to-Video:**
   - Crie nó de imagem
   - Conecte a Kling Image-to-Video
   - Gere vídeo
   - ✅ Deve funcionar sem erro

## Resumo

✅ **Problema resolvido**: Campo `image_url` agora é omitido quando não há imagem
✅ **Validação melhorada**: Verifica se é string válida antes de adicionar
✅ **Logs detalhados**: Mostra exatamente o que está sendo enviado
✅ **Funciona para ambos**: Text-to-video e Image-to-video

O erro "none is not an allowed value" não deve mais aparecer! 🎉
