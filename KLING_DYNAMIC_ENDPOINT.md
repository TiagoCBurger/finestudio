# Kling Dynamic Endpoint - Image-to-Video vs Text-to-Video

## Implementação

O sistema agora detecta automaticamente se há uma imagem conectada ao nó de vídeo e escolhe o endpoint correto da API Fal.ai:

### Endpoints Kling v2.5 Turbo Pro

- **Com imagem conectada**: `fal-ai/kling-video/v2.5-turbo/pro/image-to-video`
- **Sem imagem conectada**: `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`

## Como Funciona

### 1. Configuração do Modelo (`lib/models/video/index.ts`)

```typescript
'fal-kling-v2.5-turbo-pro': {
  label: 'Kling Video v2.5 Turbo Pro',
  providers: [{
    model: fal(
      'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',  // Endpoint primário
      'fal-ai/kling-video/v2.5-turbo/pro/text-to-video'    // Endpoint alternativo
    ),
  }],
  durations: [5, 10],
  aspectRatios: ['16:9', '9:16', '1:1'],
}
```

### 2. Lógica de Seleção (`lib/models/video/fal.ts`)

```typescript
// Escolhe o endpoint baseado na presença de imagem
const modelId = imagePrompt && textToVideoModelId 
    ? imageToVideoModelId          // Usa image-to-video se tem imagem
    : !imagePrompt && textToVideoModelId
    ? textToVideoModelId           // Usa text-to-video se não tem imagem
    : imageToVideoModelId;         // Fallback para image-to-video
```

### 3. Parâmetros da API

**Com imagem (image-to-video)**:
```json
{
  "prompt": "descrição do vídeo",
  "image_url": "https://...",
  "duration": 5,
  "aspect_ratio": "16:9"
}
```

**Sem imagem (text-to-video)**:
```json
{
  "prompt": "descrição do vídeo",
  "duration": 5,
  "aspect_ratio": "16:9"
}
```

## Comportamento

### Cenário 1: Nó de Vídeo com Imagem Conectada
1. Usuário conecta um nó de imagem ao nó de vídeo Kling
2. Sistema detecta `imagePrompt` presente
3. Usa endpoint `image-to-video`
4. Envia `image_url` na requisição

### Cenário 2: Nó de Vídeo sem Imagem
1. Usuário usa apenas prompt de texto
2. Sistema detecta `imagePrompt` ausente
3. Usa endpoint `text-to-video`
4. Não envia `image_url` na requisição

### Cenário 3: Sora 2 (Apenas Image-to-Video)
1. Sora 2 não tem endpoint text-to-video
2. Configurado com `textToVideoModelId: undefined`
3. Sempre requer imagem conectada
4. Erro se não houver imagem

## Logs de Debug

O sistema registra no console qual modo está sendo usado:

```javascript
console.log('Fal.ai video mode:', {
  hasImage: true,
  selectedEndpoint: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
  mode: 'image-to-video'
});
```

## Validação

- ✅ Kling com imagem → `image-to-video`
- ✅ Kling sem imagem → `text-to-video`
- ✅ Sora 2 com imagem → `image-to-video`
- ❌ Sora 2 sem imagem → Erro (requer imagem)

## Benefícios

1. **Automático**: Usuário não precisa escolher manualmente
2. **Flexível**: Kling funciona com ou sem imagem
3. **Correto**: Sempre usa o endpoint apropriado
4. **Extensível**: Fácil adicionar novos modelos com ambos endpoints
