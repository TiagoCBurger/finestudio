# Debug: Erro 422 do Fal.ai

## Problema
```
❌ Fal.ai job failed: {
  request_id: 'c72aac35-311e-4005-96a6-87ed24c8c8a1',
  error: 'Unexpected status code: 422',
  detail: [
    {
      input: [Object],
      loc: [Array],
      msg: 'Field required',
      type: 'missing'
    }
  ]
}
```

## O que significa erro 422?

**422 Unprocessable Entity** significa que a API do fal.ai recebeu a requisição, mas os parâmetros estão incorretos ou faltando campos obrigatórios.

## Possíveis Causas

### 1. Campo Obrigatório Faltando
Cada modelo do fal.ai tem campos obrigatórios diferentes:

#### FLUX Pro (padrão):
- ✅ `prompt` (obrigatório)
- ✅ `image_size` (obrigatório) - `{ width, height }`
- ⚠️ `image_url` (opcional) - para image-to-image

#### FLUX Dev Image-to-Image:
- ✅ `prompt` (obrigatório)
- ✅ `image_url` (obrigatório) - URL da imagem base
- ✅ `image_size` (obrigatório)
- ⚠️ `strength` (opcional) - 0.0 a 1.0

#### Nano Banana:
- ✅ `prompt` (obrigatório)
- ✅ `image_urls` (obrigatório) - array de URLs
- ⚠️ `strength` (opcional)

#### GPT Image Edit (BYOK):
- ✅ `prompt` (obrigatório)
- ✅ `image_urls` (obrigatório) - array de URLs
- ✅ `openai_api_key` (obrigatório) - sua chave OpenAI

### 2. Formato Incorreto
- `image_size` deve ser objeto: `{ width: 1024, height: 1024 }`
- `image_urls` deve ser array: `["url1", "url2"]`
- `image_url` deve ser string: `"https://..."`

### 3. URL de Imagem Inválida
- URL deve ser acessível publicamente
- URL não pode ser data URI (base64)
- URL deve retornar imagem válida

## Como Debugar

### 1. Verificar os Logs
Após tentar gerar uma imagem, verifique os logs do servidor:

```bash
# Procure por:
🔍 Fal.ai queue request: {
  modelId: '...',
  inputKeys: [...],
  fullInput: {...}
}
```

### 2. Identificar o Modelo Usado
```
modelId: 'fal-ai/flux-pro' → Modelo padrão
modelId: 'fal-ai/flux/dev/image-to-image' → Image-to-image
modelId: 'fal-ai/nano-banana/edit' → Multi-image
```

### 3. Verificar os Parâmetros Enviados
```json
{
  "prompt": "...",
  "image_size": { "width": 1024, "height": 1024 },
  "num_images": 1
}
```

### 4. Comparar com Documentação
- [FLUX Pro](https://fal.ai/models/fal-ai/flux-pro)
- [FLUX Dev](https://fal.ai/models/fal-ai/flux/dev)
- [Nano Banana](https://fal.ai/models/fal-ai/nano-banana/edit)

## Soluções Comuns

### Problema: Faltando `image_size`
```typescript
// ❌ Errado
input = {
  prompt: "...",
  width: 1024,
  height: 1024
}

// ✅ Correto
input = {
  prompt: "...",
  image_size: {
    width: 1024,
    height: 1024
  }
}
```

### Problema: Faltando `image_url` para image-to-image
```typescript
// ❌ Errado - tentando fazer image-to-image sem imagem
input = {
  prompt: "...",
  image_size: { width: 1024, height: 1024 }
}

// ✅ Correto
input = {
  prompt: "...",
  image_url: "https://...",
  image_size: { width: 1024, height: 1024 },
  strength: 0.75
}
```

### Problema: URL de imagem inválida
```typescript
// ❌ Errado - data URI não funciona
image_url: "data:image/png;base64,..."

// ❌ Errado - URL privada/signed
image_url: "https://bucket.r2.cloudflarestorage.com/...?X-Amz-..."

// ✅ Correto - URL pública
image_url: "https://pub-xxx.r2.dev/image.jpg"
```

## Próximos Passos

1. **Reinicie o servidor** para aplicar os logs
2. **Tente gerar uma imagem** novamente
3. **Copie os logs** que aparecem com `🔍 Fal.ai queue request:`
4. **Compare** os parâmetros com a documentação do modelo
5. **Identifique** qual campo está faltando ou incorreto

## Exemplo de Log Correto

### FLUX Pro (text-to-image):
```json
{
  "modelId": "fal-ai/flux-pro",
  "inputKeys": ["prompt", "image_size", "num_images"],
  "fullInput": {
    "prompt": "A beautiful sunset",
    "image_size": {
      "width": 1024,
      "height": 1024
    },
    "num_images": 1
  }
}
```

### FLUX Dev (image-to-image):
```json
{
  "modelId": "fal-ai/flux/dev/image-to-image",
  "inputKeys": ["prompt", "image_url", "image_size", "strength", "num_images"],
  "fullInput": {
    "prompt": "Make it more colorful",
    "image_url": "https://example.com/image.jpg",
    "image_size": {
      "width": 1024,
      "height": 1024
    },
    "strength": 0.75,
    "num_images": 1
  }
}
```

## Referências

- [Fal.ai Models](https://fal.ai/models)
- [Fal.ai API Docs](https://fal.ai/docs)
- [FLUX Pro Documentation](https://fal.ai/models/fal-ai/flux-pro)
- [FLUX Dev Documentation](https://fal.ai/models/fal-ai/flux/dev)
