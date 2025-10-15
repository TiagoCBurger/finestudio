# Design Document

## Overview

Esta feature melhora o componente `ModelSelector` para torná-lo mais limpo, informativo e funcional. As principais mudanças incluem:

1. Filtrar modelos desabilitados antes de renderizar
2. Remover ícones redundantes do provider (círculos com logos)
3. Implementar layout com nome à esquerda e custo em créditos à direita
4. Adicionar ícone de moeda junto ao custo numérico

## Architecture

### Componentes Afetados

- `components/nodes/model-selector.tsx` - Componente principal que será modificado
- `lib/models/image/index.ts` - Já possui a função `getEnabledImageModels()` que será utilizada
- `lib/models/video/index.ts` - Pode precisar de função similar (se aplicável)

### Fluxo de Dados

```
imageModels (todos) 
  → getEnabledImageModels() (filtrados)
    → ModelSelector (recebe apenas enabled)
      → Renderiza lista com layout atualizado
```

## Components and Interfaces

### 1. Função de Filtragem

A função `getEnabledImageModels()` já existe em `lib/models/image/index.ts` e filtra modelos com `enabled !== false`.

**Uso:**
```typescript
// Antes (passava todos os modelos)
<ModelSelector options={imageModels} ... />

// Depois (passa apenas modelos habilitados)
<ModelSelector options={getEnabledImageModels()} ... />
```

### 2. Componente ModelSelector

**Mudanças no Layout:**

```typescript
// ANTES: Layout com provider icons em círculos
<CommandItem>
  <ModelIcon /> {/* Ícone do modelo */}
  <span>{model.label}</span>
  {model.providers.map(provider => (
    <div className="rounded-full bg-secondary">
      <provider.icon /> {/* ❌ REMOVER ISTO */}
    </div>
  ))}
  {getCostBracketIcon()} {/* Indicador de bracket */}
</CommandItem>

// DEPOIS: Layout limpo com custo em créditos
<CommandItem>
  <div className="flex-1 flex items-center gap-2">
    <ModelIcon /> {/* Ícone do modelo */}
    <span>{model.label}</span>
  </div>
  <div className="flex items-center gap-1">
    <CoinsIcon /> {/* ✅ Novo ícone de moeda */}
    <span>{formatCredits(getCost())}</span> {/* ✅ Custo numérico */}
    {getCostBracketIcon()} {/* Indicador de bracket mantido */}
  </div>
</CommandItem>
```

### 3. Novo Helper: formatCredits

**Função para formatar custos:**

```typescript
const formatCredits = (cost: number): string => {
  if (cost === 0) return 'Grátis';
  if (cost < 0.01) return '<0.01';
  if (cost >= 1) return cost.toFixed(0);
  return cost.toFixed(3);
};
```

**Exemplos:**
- `0.001` → `<0.01`
- `0.025` → `0.025`
- `1` → `1`
- `20` → `20`

### 4. Ícone de Moeda

Usar o ícone `Coins` do lucide-react:

```typescript
import { Coins } from 'lucide-react';

<Coins size={14} className="text-muted-foreground" />
```

## Data Models

### TersaImageModel (já existente)

```typescript
type TersaImageModel = TersaModel & {
  providers: (TersaProvider & {
    model: ImageModel;
    getCost: (props?: {...}) => number; // ✅ Já existe
  })[];
  enabled?: boolean; // ✅ Já existe
  // ... outros campos
};
```

**Observação:** O campo `getCost()` já está implementado e retorna o custo em dólares. Precisamos converter para créditos.

### Conversão de Custo

Baseado no arquivo `lib/credits/costs.ts`, parece que o sistema usa uma taxa de conversão. Precisamos investigar como os créditos são calculados a partir do custo em dólares.

**Opções:**
1. Se `getCost()` já retorna créditos: usar diretamente
2. Se `getCost()` retorna dólares: aplicar taxa de conversão (ex: $0.001 = 1 crédito)

## Error Handling

### Modelo sem getCost

```typescript
const getModelCost = (model: TersaImageModel): number => {
  try {
    return model.providers[0]?.getCost?.() ?? 0;
  } catch (error) {
    console.warn(`Failed to get cost for model ${model.label}`, error);
    return 0;
  }
};
```

### Modelos Desabilitados

Se um modelo desabilitado for passado acidentalmente:

```typescript
// Filtro defensivo no próprio componente
const enabledOptions = Object.fromEntries(
  Object.entries(options).filter(([_, model]) => model.enabled !== false)
);
```

## Testing Strategy

### Testes Manuais

1. **Filtro de Modelos Desabilitados**
   - Verificar que `fal-gpt-image-edit` (enabled: false) não aparece na lista
   - Verificar que modelos com `enabled: true` aparecem normalmente
   - Verificar que modelos sem flag `enabled` aparecem (default true)

2. **Layout de Custo**
   - Verificar que o ícone de moeda aparece ao lado do custo
   - Verificar que o custo numérico está formatado corretamente
   - Verificar que o indicador de bracket (setas) ainda aparece
   - Verificar que o tooltip do bracket ainda funciona

3. **Remoção de Provider Icons**
   - Verificar que os círculos com logos do provider foram removidos
   - Verificar que o ícone do modelo (à esquerda) permanece
   - Verificar que o layout está limpo e organizado

4. **Estados Visuais**
   - Verificar cores quando item está selecionado
   - Verificar cores quando item está em hover
   - Verificar cores quando item está desabilitado (por plano)
   - Verificar responsividade do layout

### Casos de Teste

| Cenário | Entrada | Resultado Esperado |
|---------|---------|-------------------|
| Modelo habilitado | `enabled: true` | Aparece na lista |
| Modelo desabilitado | `enabled: false` | Não aparece na lista |
| Modelo sem flag | `enabled: undefined` | Aparece na lista (default true) |
| Custo baixo | `getCost() = 0.001` | Mostra "<0.01" |
| Custo médio | `getCost() = 0.025` | Mostra "0.025" |
| Custo alto | `getCost() = 20` | Mostra "20" |
| Custo zero | `getCost() = 0` | Mostra "Grátis" |

## Design Decisions

### 1. Por que remover os provider icons?

**Decisão:** Remover os círculos com logos do provider (fal, etc.)

**Razão:** 
- Informação redundante (já está no grupo/heading)
- Polui visualmente o layout
- Espaço melhor utilizado para mostrar custo

### 2. Por que manter o indicador de bracket?

**Decisão:** Manter as setas de indicador de preço (lowest, low, high, highest)

**Razão:**
- Fornece contexto visual rápido
- Complementa o custo numérico
- Já familiar para usuários existentes
- Tooltip fornece informação adicional útil

### 3. Formato do custo

**Decisão:** Mostrar número + ícone de moeda, sem texto "créditos"

**Razão:**
- Mais limpo e compacto
- Ícone é auto-explicativo
- Economiza espaço horizontal
- Padrão comum em UIs de créditos/moedas

### 4. Posicionamento do custo

**Decisão:** Custo à direita, alinhado com outros elementos

**Razão:**
- Padrão de leitura (esquerda → direita)
- Nome do modelo é mais importante (esquerda)
- Custo é informação secundária (direita)
- Facilita comparação visual entre modelos

## Implementation Notes

### Ordem de Implementação

1. Adicionar função `formatCredits` helper
2. Importar ícone `Coins` do lucide-react
3. Remover seção de provider icons do JSX
4. Adicionar nova seção de custo com ícone e valor
5. Ajustar estilos e espaçamento
6. Testar com diferentes modelos e estados

### Componentes que Usam ModelSelector

Verificar onde `ModelSelector` é usado para garantir que passamos modelos filtrados:

```bash
# Buscar usos do ModelSelector
grep -r "ModelSelector" components/nodes/
```

Locais prováveis:
- `components/nodes/image/transform.tsx`
- `components/nodes/video/transform.tsx`
- Outros nós que permitem seleção de modelo

### Compatibilidade

- Manter compatibilidade com prop `disabled` existente
- Manter compatibilidade com sistema de planos (hobby vs pro)
- Manter funcionalidade de tooltip
- Manter funcionalidade de busca (CommandInput)
