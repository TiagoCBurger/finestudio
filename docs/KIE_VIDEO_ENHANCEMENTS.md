# KIE Video Enhancements - Implementation Summary

## Implementado ✅

1. **Modelo KIE Kling v2.5 Turbo Pro (Image-to-Video)**
   - Geração de vídeo a partir de imagem
   - Webhook funcionando
   - Upload para storage
   - Atualização do nó via Realtime
   - Fix de flickering aplicado

## Pendente 🔄

### 1. Text-to-Video Support
- Adicionar modelo `kling/v2-5-turbo-text-to-video-pro`
- Rotear automaticamente baseado na presença de imagem
- Estrutura já preparada no código

### 2. Aspect Ratio
- Passar `aspect_ratio` corretamente para API KIE
- Formato: "16-9", "9-16", "1-1" (com hífen, não dois-pontos)
- Atualmente sendo ignorado pela API

### 3. CFG Scale Control
- Adicionar slider/input para CFG scale (0-1, step 0.1)
- Passar via metadata para o servidor
- Default: 0.5

## Próximos Passos

### Passo 1: Atualizar kie.server.ts
```typescript
// Já feito parcialmente, precisa completar:
- Validação condicional de imagePrompt
- Preparação correta do input com aspect_ratio
- Suporte a CFG scale via metadata
```

### Passo 2: Registrar modelo text-to-video
```typescript
// Em lib/models/video/index.ts e index.server.ts
'kie-kling-text-to-video': {
  label: 'Kling Text-to-Video (KIE)',
  chef: providers.kie,
  providers: [{
    ...providers.kie,
    model: kie('kling/v2-5-turbo-text-to-video-pro'),
    getCost: ({ duration }) => duration <= 5 ? 0.35 : 0.7,
  }],
  durations: [5, 10],
  aspectRatios: ['16:9', '9:16', '1:1'],
  enabled: true,
}
```

### Passo 3: Adicionar CFG Scale UI
```typescript
// Criar componente VideoCfgScaleSelector
// Similar a ImageSizeSelector mas com slider
// Range: 0-1, step: 0.1, default: 0.5
```

### Passo 4: Passar CFG Scale via metadata
```typescript
// Em app/actions/video/create.ts
_metadata: {
  nodeId,
  projectId,
  cfgScale: data.cfgScale ?? 0.5
}
```

## Notas Técnicas

- API KIE usa hífen no aspect_ratio: "16-9" não "16:9"
- Text-to-video não precisa de image_url
- CFG scale controla aderência ao prompt (0=criativo, 1=literal)
- Webhook já suporta ambos os modelos (image e text)
