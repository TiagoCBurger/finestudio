# Guia de Handles do Modelo Kling (KIE)

## Visão Geral

O nó de vídeo Kling possui handles personalizados para diferentes tipos de entrada, facilitando a organização do workflow.

## Handles Disponíveis

### 1. Handle Principal - "Prompt"
**Localização**: Superior esquerdo (30% da altura)

**Características**:
- Cor: Azul (padrão do React Flow)
- Label: "Prompt" (texto cinza ao lado)
- ID: `prompt`

**Aceita**:
- ✅ Nós de texto (para prompt principal)
- ✅ Nós de imagem (para image-to-video)

**Comportamento**:
- Quando conectado a texto: Usa como prompt principal
- Quando conectado a imagem: Modo image-to-video (aspect ratio oculto)
- Pode receber múltiplas conexões

---

### 2. Handle Negative Prompt - "Negative"
**Localização**: Inferior esquerdo (70% da altura)

**Características**:
- Cor: Vermelho (#ef4444)
- Label: "Negative" (texto vermelho ao lado)
- ID: `negative-prompt`
- **Visível apenas quando modelo Kling está selecionado**

**Aceita**:
- ✅ Nós de texto (para negative prompt)
- ❌ Nós de imagem (não aceita)

**Comportamento**:
- Quando conectado: Usa texto do nó conectado como negative prompt
- Quando desconectado: Usa valor padrão "blur, distort, and low quality"
- Prioridade: Texto conectado > Valor padrão

---

## Como Usar

### Cenário 1: Text-to-Video com Negative Prompt
```
[Nó de Texto: "A beautiful sunset"] 
    ↓ (conectar ao handle "Prompt")
[Nó de Vídeo Kling]
    ↑ (conectar ao handle "Negative")
[Nó de Texto: "blur, low quality, distorted"]
```

**Resultado**:
- Prompt: "A beautiful sunset"
- Negative: "blur, low quality, distorted"
- Aspect ratio: Visível (text-to-video)

---

### Cenário 2: Image-to-Video com Negative Prompt
```
[Nó de Imagem] 
    ↓ (conectar ao handle "Prompt")
[Nó de Vídeo Kling]
    ↑ (conectar ao handle "Negative")
[Nó de Texto: "camera shake, blur"]
```

**Resultado**:
- Imagem: Usada como base
- Negative: "camera shake, blur"
- Aspect ratio: **Oculto** (baseado na imagem)

---

### Cenário 3: Sem Negative Prompt
```
[Nó de Texto: "A beautiful sunset"] 
    ↓ (conectar ao handle "Prompt")
[Nó de Vídeo Kling]
```

**Resultado**:
- Prompt: "A beautiful sunset"
- Negative: "blur, distort, and low quality" (padrão)
- Aspect ratio: Visível

---

## Identificação Visual

### Quando o Nó Está Selecionado
- Ambos os handles ficam mais visíveis
- Labels aparecem claramente ao lado de cada handle
- Handle vermelho se destaca do azul padrão

### Durante Conexão
- Ao arrastar uma conexão, os handles compatíveis ficam destacados
- Handle "Negative" só aceita nós de texto
- Handle "Prompt" aceita texto e imagens

---

## Dicas de Uso

1. **Organize Verticalmente**: Coloque nós de texto acima e abaixo do nó de vídeo para facilitar conexões

2. **Use Cores**: O handle vermelho indica funcionalidade especial (negative prompt)

3. **Teste Diferentes Negatives**: Conecte diferentes nós de texto ao handle vermelho para experimentar

4. **Combine com Instruções**: Você ainda pode usar o campo de instruções interno do nó

---

## Troubleshooting

### "Não consigo conectar ao handle vermelho"
- ✅ Verifique se o modelo Kling está selecionado
- ✅ Certifique-se de estar conectando um nó de **texto** (não imagem)
- ✅ Tente selecionar o nó de vídeo primeiro

### "O handle vermelho não aparece"
- ✅ Selecione um modelo Kling (kie-kling-v2.5-turbo-pro)
- ✅ O handle só aparece para modelos Kling

### "Não vejo os labels dos handles"
- ✅ Os labels aparecem sempre ao lado dos handles
- ✅ Tente dar zoom no canvas
- ✅ Selecione o nó para melhor visualização

---

## Especificações Técnicas

### Handle "Prompt"
```typescript
{
  type: "target",
  position: Position.Left,
  id: "prompt",
  style: { top: '30%' }
}
```

### Handle "Negative"
```typescript
{
  type: "target",
  position: Position.Left,
  id: "negative-prompt",
  style: { top: '70%', background: '#ef4444' }
}
```

### Filtragem de Conexões
```typescript
// Prompt handle
const promptIncomers = allIncomers.filter((node) => {
  const edge = edges.find(
    (e) => e.target === id && 
           e.source === node.id && 
           (!e.targetHandle || e.targetHandle === 'prompt')
  );
  return !!edge;
});

// Negative prompt handle
const negativePromptIncomers = allIncomers.filter((node) => {
  const edge = edges.find(
    (e) => e.target === id && 
           e.source === node.id && 
           e.targetHandle === 'negative-prompt'
  );
  return !!edge;
});
```
