# Melhorias no Modelo KIE de Vídeo

## Resumo das Mudanças

Este documento descreve as melhorias implementadas no modelo Kling (KIE) de geração de vídeo.

## Funcionalidades Implementadas

### 1. Aspect Ratio Condicional
- **Comportamento**: O `aspect_ratio` agora é enviado apenas para o modo **text-to-video** (quando não há imagem conectada)
- **Razão**: No modo **image-to-video**, o aspect ratio é determinado automaticamente pelo tamanho da imagem de entrada
- **Implementação**: 
  - Arquivo: `lib/models/video/kie.server.ts`
  - Lógica: Se `imagePrompt` está presente, não inclui `aspect_ratio` no payload
  - Se não há imagem, inclui `aspect_ratio` no payload para text-to-video

### 2. Controle de Temperatura (cfg_scale)
- **Nome para o usuário**: "Temperatura"
- **Range**: 0 a 1
- **Steps**: 0.1
- **Valor padrão**: 0.5
- **Implementação**:
  - Novo componente: `components/nodes/video/cfg-scale-slider.tsx`
  - Slider visual com valor exibido
  - Aparece apenas quando modelo Kling está selecionado
  - Armazenado no campo `cfgScale` do nó

### 3. Negative Prompt via Handle
- **Funcionalidade**: Handle de entrada dedicado para receber negative prompt de outros nós
- **Visibilidade**: Handle vermelho aparece apenas quando modelo Kling está selecionado
- **Posição**: Handle inferior esquerdo (70% da altura do nó)
- **Valor padrão**: "blur, distort, and low quality" (se nenhum nó conectado)
- **Implementação**:
  - Handle personalizado com ID `negative-prompt`
  - Cor vermelha (#ef4444) para diferenciação visual
  - Aceita conexões de nós de texto
  - Prioriza texto de nós conectados sobre valor padrão

### 4. Limitação de Imagens no Modelo KIE de Imagem
- **Comportamento**: Modelos KIE de imagem (Nano Banana) agora aceitam apenas 1 imagem conectada
- **Implementação**:
  - Arquivo: `components/nodes/image/transform.tsx`
  - Validação automática que limita a primeira imagem quando múltiplas estão conectadas
  - Log de aviso quando múltiplas imagens são detectadas

## Arquivos Modificados

### Backend
1. `lib/models/video/kie.server.ts`
   - Adicionado suporte para `negativePrompt` e `cfgScale`
   - Lógica condicional para `aspect_ratio` (apenas text-to-video)
   - Interface `KieTextToVideoInput` atualizada

2. `lib/models/video/index.ts`
   - Tipo `VideoModel` atualizado com novos parâmetros

3. `app/actions/video/create.ts`
   - Action atualizada para passar `negativePrompt` e `cfgScale`

### Frontend
1. `components/nodes/video/transform.tsx`
   - Adicionado handles personalizados (prompt e negative-prompt)
   - Lógica para separar incomers por handle
   - Slider de temperatura no toolbar (apenas Kling)
   - Aspect ratio oculto para image-to-video do Kling
   - Priorização de negative prompt de nós conectados

2. `components/nodes/video/index.tsx`
   - Tipo `VideoNodeProps` atualizado com novos campos

3. `components/nodes/video/cfg-scale-slider.tsx` (NOVO)
   - Componente de slider para controle de temperatura

4. `components/nodes/image/transform.tsx`
   - Validação para limitar a 1 imagem em modelos KIE

## Comportamento por Modo

### Image-to-Video (com imagem conectada)
```typescript
{
  prompt: "...",
  image_url: "https://...",
  duration: "5",
  negative_prompt: "blur, distort, and low quality",
  cfg_scale: 0.5
  // aspect_ratio NÃO é enviado
}
```

### Text-to-Video (sem imagem conectada)
```typescript
{
  prompt: "...",
  duration: "5",
  aspect_ratio: "16:9",  // ✅ Enviado apenas neste modo
  negative_prompt: "blur, distort, and low quality",
  cfg_scale: 0.5
}
```

## Interface do Usuário

### Toolbar do Nó de Vídeo (quando Kling selecionado)
1. Seletor de modelo
2. Seletor de duração (5s ou 10s)
3. Seletor de aspect ratio (oculto quando há imagem conectada)
4. **Slider de Temperatura** (0 a 1) - NOVO
5. Botão de gerar/regenerar
6. Botão de download (quando vídeo gerado)

### Handles de Conexão (quando Kling selecionado)
1. **Handle principal** (superior esquerdo, 30%): 
   - Label: "Prompt"
   - Cor: Azul (padrão)
   - Aceita: Prompt e imagens
   
2. **Handle negative prompt** (inferior esquerdo, 70%): - NOVO
   - Label: "Negative" (em vermelho)
   - Cor: Vermelho (#ef4444)
   - Aceita: Apenas texto
   - Visível apenas quando Kling está selecionado

### Campos de Texto
1. **Prompt principal** (sempre visível)

## Validações

### Modelo KIE de Imagem
- ✅ Aceita apenas 1 imagem conectada
- ⚠️ Se múltiplas imagens conectadas, usa apenas a primeira
- 📝 Log de aviso quando limitação é aplicada

### Modelo KIE de Vídeo
- ✅ `cfg_scale` entre 0 e 1
- ✅ `negative_prompt` opcional
- ✅ `aspect_ratio` apenas para text-to-video

## Testes Recomendados

1. **Text-to-Video**:
   - Conectar apenas nó de texto ao handle principal
   - Verificar que aspect_ratio é enviado
   - Verificar que seletor de aspect ratio está visível
   - Testar diferentes valores de temperatura
   - Conectar nó de texto ao handle negative prompt (vermelho)
   - Verificar que negative prompt é usado

2. **Image-to-Video**:
   - Conectar nó de imagem ao handle principal
   - Verificar que aspect_ratio NÃO é enviado
   - Verificar que seletor de aspect ratio está OCULTO
   - Verificar que aspect ratio é baseado na imagem
   - Conectar nó de texto ao handle negative prompt
   - Verificar que negative prompt é usado

3. **Modelo KIE de Imagem**:
   - Conectar múltiplas imagens
   - Verificar que apenas 1 é usada
   - Verificar log de aviso

4. **Handles Personalizados**:
   - Verificar que handle vermelho aparece apenas para Kling
   - Conectar texto ao handle vermelho
   - Verificar que texto é usado como negative prompt
   - Desconectar e verificar que valor padrão é usado

## Handles Personalizados

### Handle Principal (Prompt)
- **ID**: `prompt`
- **Posição**: 30% da altura (superior)
- **Cor**: Padrão (azul)
- **Aceita**: Nós de texto e imagem
- **Função**: Recebe o prompt principal e imagens para geração

### Handle Negative Prompt
- **ID**: `negative-prompt`
- **Posição**: 70% da altura (inferior)
- **Cor**: Vermelho (#ef4444)
- **Label**: "Negative" (texto vermelho ao lado do handle)
- **Aceita**: Apenas nós de texto
- **Visibilidade**: Apenas quando modelo Kling está selecionado
- **Função**: Recebe texto para negative prompt
- **Prioridade**: Texto conectado > Valor padrão
- **Visual**: Handle vermelho com label "Negative" sempre visível

## Compatibilidade

- ✅ Compatível com modelos Kling existentes
- ✅ Não afeta outros modelos de vídeo (Sora, WAN-25)
- ✅ Valores padrão garantem funcionamento sem configuração
- ✅ Campos opcionais não quebram implementações existentes
- ✅ Handles aparecem apenas quando necessário (Kling)
- ✅ Aspect ratio oculto automaticamente para image-to-video
