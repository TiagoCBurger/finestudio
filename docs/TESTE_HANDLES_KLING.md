# Teste dos Handles do Kling

## Checklist de Teste

### 1. Verificar Visibilidade dos Handles

**Passos**:
1. Adicione um nó de vídeo ao canvas
2. Selecione o modelo "Kling Video v2.5 Turbo Pro (KIE)"
3. Verifique se aparecem **2 handles** no lado esquerdo:
   - Handle superior (30%): Label "Prompt" em cinza
   - Handle inferior (70%): Label "Negative" em vermelho

**Resultado Esperado**:
- ✅ Dois handles visíveis
- ✅ Labels aparecem ao lado dos handles
- ✅ Handle inferior é vermelho
- ✅ Labels têm fundo semi-transparente

**Como Verificar no Console**:
Abra o console do navegador (F12) e procure por:
```
🔌 [Video Transform] Conexões detectadas:
```

---

### 2. Testar Conexão ao Handle "Prompt"

**Passos**:
1. Adicione um nó de texto ao canvas
2. Arraste uma conexão do nó de texto para o handle superior (Prompt) do nó de vídeo
3. A conexão deve ser aceita

**Resultado Esperado**:
- ✅ Conexão criada com sucesso
- ✅ Edge conectada ao handle superior

---

### 3. Testar Conexão ao Handle "Negative"

**Passos**:
1. Adicione outro nó de texto ao canvas
2. Digite algo como "blur, low quality, distorted"
3. Arraste uma conexão do nó de texto para o handle inferior (Negative) do nó de vídeo
4. A conexão deve ser aceita

**Resultado Esperado**:
- ✅ Conexão criada com sucesso
- ✅ **Edge aparece em VERMELHO e ANIMADA** (diferente das outras)
- ✅ Edge conectada ao handle inferior (vermelho)
- ✅ Texto do nó é usado como negative prompt

**Como Verificar no Console**:
Ao clicar em gerar, procure por:
```
📝 [Video Transform] Negative Prompt: {
  fromConnectedNodes: true,
  negativePromptTexts: ["blur, low quality, distorted"],
  finalNegativePrompt: "blur, low quality, distorted",
  hasNegativeConnection: true
}
```

---

### 4. Testar com Imagem

**Passos**:
1. Adicione um nó de imagem ao canvas
2. Conecte ao handle superior (Prompt)
3. Verifique se o seletor de aspect ratio desaparece

**Resultado Esperado**:
- ✅ Conexão aceita
- ✅ Seletor de aspect ratio oculto
- ✅ Modo image-to-video ativado

---

### 5. Testar Múltiplas Conexões

**Passos**:
1. Conecte um nó de texto ao handle "Prompt"
2. Conecte outro nó de texto ao handle "Negative"
3. Clique em gerar

**Resultado Esperado**:
- ✅ Ambas as conexões funcionam
- ✅ Prompt principal vem do handle superior
- ✅ Negative prompt vem do handle inferior

---

### 6. Testar com Outro Modelo

**Passos**:
1. Mude o modelo para "Sora 2 Pro" ou outro não-Kling
2. Verifique os handles

**Resultado Esperado**:
- ✅ Handle "Negative" desaparece
- ✅ Apenas handle padrão visível
- ✅ Seletor de aspect ratio sempre visível

---

## Troubleshooting

### Problema: Não consigo conectar ao handle vermelho

**Soluções**:
1. Verifique se o modelo Kling está selecionado
2. Certifique-se de estar usando um nó de **texto** (não imagem)
3. Tente recarregar a página
4. Verifique se o handle vermelho está visível

### Problema: Handle vermelho não aparece

**Soluções**:
1. Selecione o modelo "Kling Video v2.5 Turbo Pro (KIE)"
2. Verifique se o nó é do tipo "transform" (tem conexões de entrada)
3. Recarregue a página

### Problema: Labels não aparecem

**Soluções**:
1. Dê zoom no canvas
2. Selecione o nó
3. Verifique se há espaço suficiente à esquerda do nó

### Problema: Conexão não funciona

**Soluções**:
1. Verifique se está arrastando do handle de **saída** (direita) do nó de texto
2. Para o handle de **entrada** (esquerda) do nó de vídeo
3. Certifique-se de que o handle está destacado ao arrastar

---

## Logs de Debug

### Como Verificar se as Conexões Estão Funcionando

Abra o console do navegador (F12) e procure pelos seguintes logs ao clicar em gerar:

#### 1. Log de Conexões
```javascript
🔌 [Video Transform] Conexões detectadas: {
  totalIncomers: 2,
  promptIncomers: 1,
  negativePromptIncomers: 1,
  edges: [
    { source: "text-node-1", targetHandle: "prompt" },
    { source: "text-node-2", targetHandle: "negative-prompt" }
  ],
  textPrompts: 1,
  images: 0,
  negativePromptTexts: 1
}
```

**O que verificar**:
- `negativePromptIncomers`: Deve ser > 0 se conectou ao handle vermelho
- `edges`: Deve mostrar `targetHandle: "negative-prompt"` para a conexão vermelha
- `negativePromptTexts`: Deve ser > 0 se o texto foi extraído corretamente

#### 2. Log do Negative Prompt
```javascript
📝 [Video Transform] Negative Prompt: {
  fromConnectedNodes: true,
  negativePromptTexts: ["blur, low quality"],
  finalNegativePrompt: "blur, low quality",
  hasNegativeConnection: true
}
```

**O que verificar**:
- `fromConnectedNodes`: Deve ser `true` se usou texto do nó conectado
- `finalNegativePrompt`: Deve mostrar o texto que será enviado para a API

#### 3. Log da API KIE
```javascript
🎬 KIE.ai video generation: {
  modelId: "kling/v2-5-turbo-text-to-video-pro",
  hasImage: false,
  mode: "text-to-video",
  duration: 5,
  aspectRatio: "16:9",
  negativePrompt: "blur, low quality",
  cfgScale: 0.5
}
```

**O que verificar**:
- `negativePrompt`: Deve mostrar o texto do nó conectado

---

## Exemplo de Workflow Completo

```
[Nó de Texto: "A beautiful sunset over the ocean"]
    ↓ (conectar ao handle "Prompt" - superior)
[Nó de Vídeo Kling]
    ↑ (conectar ao handle "Negative" - inferior, vermelho)
[Nó de Texto: "blur, camera shake, low quality"]
```

**Ao gerar**:
- Prompt: "A beautiful sunset over the ocean"
- Negative: "blur, camera shake, low quality"
- Duração: 5s (padrão)
- Aspect Ratio: 16:9 (visível e configurável)
- Temperatura: 0.5 (ajustável no slider)

---

## Verificação Visual

### Handle "Prompt" (Superior)
```
🔵 ← Prompt
```
- Cor: Azul (padrão)
- Posição: 30% da altura
- Label: "Prompt" em cinza
- Edge: Azul normal

### Handle "Negative" (Inferior)
```
🔴 ← Negative (edge vermelha animada)
```
- Cor: Vermelho
- Posição: 70% da altura
- Label: "Negative" em vermelho
- **Edge: Vermelha e animada** (fácil identificação)
- Apenas visível para Kling

### Identificação Visual das Edges
- **Edge Azul Normal**: Conectada ao handle "Prompt"
- **Edge Vermelha Animada**: Conectada ao handle "Negative" ⭐

---

## Comportamento Esperado por Cenário

| Cenário | Handle Prompt | Handle Negative | Aspect Ratio |
|---------|---------------|-----------------|--------------|
| Kling + Texto | ✅ Visível | ✅ Visível | ✅ Visível |
| Kling + Imagem | ✅ Visível | ✅ Visível | ❌ Oculto |
| Sora + Texto | ✅ Visível | ❌ Oculto | ✅ Visível |
| Sora + Imagem | ✅ Visível | ❌ Oculto | ✅ Visível |

---

## Contato para Suporte

Se os handles ainda não funcionarem após seguir este guia:
1. Verifique o console do navegador para erros
2. Tire um screenshot mostrando os handles
3. Verifique se a versão do código está atualizada
