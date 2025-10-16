# Nano Banana Requer Imagens Conectadas

## Problema
Erro 422 ao tentar gerar imagem com Nano Banana:
```
❌ Fal.ai job failed: {
  error: 'Unexpected status code: 422',
  detail: [{ msg: 'Field required', type: 'missing' }]
}
```

## Causa
O modelo **Nano Banana** (`fal-ai/nano-banana/edit`) é um modelo de **edição de imagens** que **REQUER** pelo menos uma imagem como entrada. Ele não pode gerar imagens do zero apenas com texto.

## Solução

### ✅ Como Usar o Nano Banana Corretamente

1. **Crie um nó de imagem** (ou use um existente)
2. **Conecte o nó de imagem ao nó do Nano Banana**
3. **Adicione instruções** de como você quer editar a imagem
4. **Gere a imagem**

### Exemplo de Fluxo Correto:

```
[Nó de Texto: "A beautiful sunset"]
         ↓
[Nó de Imagem: FLUX Pro] → Gera imagem base
         ↓
[Nó de Imagem: Nano Banana] → Edita a imagem
  Instruções: "Make it more vibrant and add clouds"
```

### Múltiplas Imagens (Recurso Especial do Nano Banana):

O Nano Banana suporta **múltiplas imagens** como entrada!

```
[Nó de Imagem 1] ──┐
                   ├──→ [Nó de Imagem: Nano Banana]
[Nó de Imagem 2] ──┘     Instruções: "Combine both images"
```

## Modelos que Requerem Imagens

### 🔴 Requerem Imagens (não funcionam sem):
- **Nano Banana** (`fal-ai/nano-banana/edit`)
- **GPT Image Edit** (`fal-ai/gpt-image-1/edit-image/byok`)
- **FLUX Dev Image-to-Image** (`fal-ai/flux/dev/image-to-image`)

### 🟢 Funcionam Sem Imagens (text-to-image):
- **FLUX Pro** (`fal-ai/flux-pro`)
- **FLUX Dev** (`fal-ai/flux/dev`)
- **Stable Diffusion** (vários modelos)

### 🟡 Opcionais (funcionam com ou sem):
- **FLUX Pro Kontext** - Pode usar imagens como referência opcional

## Validação Implementada

Agora o código valida se as imagens estão presentes antes de enviar para o fal.ai:

```typescript
if (isNanoBanana) {
  const images = providerOptions?.fal?.images;
  if (!images || images.length === 0) {
    throw new Error('Nano Banana model requires at least one image. Please connect an image node to this node.');
  }
  input.image_urls = images;
  input.strength = 0.75;
}
```

## Mensagens de Erro Melhoradas

Agora você verá mensagens claras:

### ❌ Antes:
```
Error: Unexpected status code: 422
Field required
```

### ✅ Agora:
```
Error: Nano Banana model requires at least one image. 
Please connect an image node to this node.
```

## Como Conectar Nós

### No Canvas:
1. Clique e arraste da **saída** (círculo direito) do nó de imagem
2. Solte na **entrada** (círculo esquerdo) do nó Nano Banana
3. A conexão aparecerá como uma linha entre os nós

### Verificar Conexões:
- Nós conectados mostram linhas entre eles
- O nó Nano Banana deve ter pelo menos uma linha chegando nele
- Você pode conectar múltiplas imagens ao Nano Banana

## Dicas

### Para Edição Simples:
Use apenas 1 imagem conectada + instruções claras

### Para Combinação de Imagens:
Conecte 2-3 imagens e use instruções como:
- "Combine both images"
- "Merge the style of image 1 with the content of image 2"
- "Create a blend of all images"

### Para Variações:
Use a mesma imagem + instruções diferentes:
- "Make it more colorful"
- "Add dramatic lighting"
- "Change to nighttime"

## Alternativas

Se você quer gerar imagens do zero (sem imagem base):

### Use FLUX Pro ou FLUX Dev:
```
[Nó de Texto: "A beautiful sunset"]
         ↓
[Nó de Imagem: FLUX Pro] → Gera imagem do zero
```

### Depois Edite com Nano Banana:
```
[Nó de Texto: "A beautiful sunset"]
         ↓
[Nó de Imagem: FLUX Pro] → Gera imagem base
         ↓
[Nó de Imagem: Nano Banana] → Edita/refina
  Instruções: "Make it more vibrant"
```

## Resumo

✅ **Nano Banana = Editor de Imagens**
- Requer pelo menos 1 imagem conectada
- Suporta múltiplas imagens
- Ótimo para edições e combinações

❌ **Nano Banana ≠ Gerador de Imagens**
- Não funciona apenas com texto
- Precisa de imagem base

💡 **Dica**: Use FLUX Pro para gerar, Nano Banana para editar!
