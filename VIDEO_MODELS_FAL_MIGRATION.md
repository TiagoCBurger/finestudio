# Migração dos Modelos de Vídeo para Fal.ai

## Resumo das Mudanças

Substituímos todos os providers de vídeo antigos pelos modelos da Fal.ai, simplificando significativamente o código e mantendo apenas os modelos mais eficientes.

## Modelos Removidos

### Minimax (6 modelos)
- ❌ `minimax-t2v-01-director` - T2V-01-Director
- ❌ `minimax-i2v-01-director` - I2V-01-Director
- ❌ `minimax-s2v-01` - S2V-01
- ❌ `minimax-i2v-01` - I2V-01
- ❌ `minimax-i2v-01-live` - I2V-01-live
- ❌ `minimax-t2v-01` - T2V-01

### Runway (2 modelos)
- ❌ `runway-gen4-turbo` - Gen4 Turbo (era default)
- ❌ `runway-gen3a-turbo` - Gen3a Turbo

### Luma (3 modelos)
- ❌ `luma-ray-1.6` - Ray 1.6
- ❌ `luma-ray-2` - Ray 2
- ❌ `luma-ray-flash-2` - Ray Flash 2

### Kling via Replicate (5 modelos)
- ❌ `kling-v1.5-standard` - Kling v1.5 Standard
- ❌ `kling-v1.5-pro` - Kling v1.5 Pro
- ❌ `kling-v1.6-standard` - Kling v1.6 Standard
- ❌ `kling-v1.6-pro` - Kling v1.6 Pro
- ❌ `kling-v2.0` - Kling v2.0

**Total removido: 16 modelos**

## Modelos Mantidos (Fal.ai)

### ✅ Kling Video v2.5 Turbo Pro (DEFAULT)
- **ID**: `fal-kling-v2.5-turbo-pro`
- **Label**: "Kling Video v2.5 Turbo Pro"
- **Provider**: Fal.ai
- **Model ID**: `fal-ai/kling-video/v2.5-turbo/pro/image-to-video`
- **Custo**: 
  - 5s: $0.35
  - 10s: $0.70
- **Status**: ✅ Habilitado e definido como padrão
- **Tipo**: Image-to-video (requer imagem de entrada)

### ✅ Sora 2 Pro
- **ID**: `fal-sora-2-pro`
- **Label**: "Sora 2 Pro"
- **Provider**: Fal.ai
- **Model ID**: `fal-ai/sora-2/image-to-video/pro`
- **Custo**: $1.20 (fixo, independente da duração)
- **Durações aceitas**: 4s, 8s, ou 12s (ajustado automaticamente)
- **Status**: ✅ Habilitado
- **Tipo**: Image-to-video (requer imagem de entrada)
- **Nota**: Se a duração solicitada for 5s, será ajustada para 4s automaticamente

**Total mantido: 2 modelos**

## Mudanças no Código

### Antes
```typescript
// 16 modelos de 5 providers diferentes
// Imports complexos com tratamento de erro
let fal: any;
let luma: any;
let minimax: any;
let replicate: any;
let runway: any;

try {
  fal = require('./fal').fal;
  luma = require('./luma').luma;
  // ... etc
} catch (error) {
  // ... fallbacks
}
```

### Depois
```typescript
// 2 modelos de 1 provider
import { fal } from './fal';
```

### Redução de Código
- **Linhas removidas**: ~350 linhas
- **Imports simplificados**: De 5 providers para 1
- **Complexidade reduzida**: 87.5% menos modelos

## Benefícios

1. **Código mais limpo**: Menos dependências e imports
2. **Manutenção simplificada**: Apenas 1 provider para gerenciar
3. **Melhor performance**: Menos código para carregar
4. **Custos mais previsíveis**: Apenas 2 modelos com preços claros
5. **Menos erros**: Menos pontos de falha no carregamento

## Impacto nos Usuários

### Positivo
- ✅ Interface mais simples com menos opções
- ✅ Modelos mais modernos (Kling v2.5 e Sora 2)
- ✅ Custos competitivos
- ✅ Melhor confiabilidade (1 provider vs 5)

### Considerações
- ⚠️ Ambos os modelos requerem imagem de entrada (image-to-video)
- ⚠️ Não há mais opção de text-to-video puro
- ⚠️ Usuários que usavam outros providers precisarão migrar

## Arquivos Modificados

1. **lib/models/video/index.ts**
   - Removidos imports de luma, minimax, replicate, runway
   - Removidos 16 modelos antigos
   - Mantidos apenas 2 modelos Fal.ai
   - Simplificado tratamento de erros

## Próximos Passos

### Opcional - Adicionar mais modelos Fal.ai
Se necessário, podemos adicionar outros modelos da Fal.ai:
- `fal-ai/kling-video/v2.5-turbo/standard/image-to-video` (mais barato)
- `fal-ai/sora-2/text-to-video/pro` (text-to-video)
- Outros modelos disponíveis em https://fal.ai/models

### Limpeza de Arquivos
Considerar remover arquivos não utilizados:
- `lib/models/video/luma.ts`
- `lib/models/video/minimax.ts`
- `lib/models/video/replicate.ts`
- `lib/models/video/runway.ts`

## Teste

Para testar as mudanças:

1. **Criar nó de vídeo**
2. **Conectar nó de imagem** (ambos os modelos requerem imagem)
3. **Verificar ModelSelector**:
   - Deve mostrar apenas 2 modelos
   - "Kling Video v2.5 Turbo Pro" deve ser o padrão
   - Custos devem aparecer corretamente
4. **Gerar vídeo** com cada modelo
5. **Verificar console** - não deve haver erros

## Documentação Relacionada

- [Fal.ai Models](https://fal.ai/models)
- [Fal.ai Pricing](https://fal.ai/pricing)
- [VIDEO_NODE_ERROR_FIX.md](./VIDEO_NODE_ERROR_FIX.md) - Correção do erro anterior
