# Referência Visual de Estados - ModelSelector

**Data:** 14/10/2025  
**Componente:** `components/nodes/model-selector.tsx`

## Visão Geral

Este documento serve como referência visual para os estados do ModelSelector, mostrando as classes CSS aplicadas e o resultado esperado em cada situação.

## Estados Implementados

### 1. Item Selecionado (Selected)

**Quando:** `value === id`

**Classes Aplicadas:**
```tsx
<CommandItem
  className="bg-primary text-primary-foreground 
             data-[selected=true]:bg-primary/80 
             data-[selected=true]:text-primary-foreground"
>
  {/* Ícone do modelo */}
  <ModelIcon className="text-primary-foreground" />
  
  {/* Nome do modelo */}
  <span>Flux Pro 1.1</span>
  
  {/* Ícone de moeda */}
  <Coins className="text-primary-foreground" />
  
  {/* Custo */}
  <span className="text-primary-foreground">0.055</span>
  
  {/* Indicador de bracket */}
  {getCostBracketIcon(bracket, 'text-primary-foreground')}
</CommandItem>
```

**Resultado Visual:**
```
┌─────────────────────────────────────────────────┐
│ 🎨 Flux Pro 1.1              💰 0.055 ⬇️        │  ← Fundo roxo
│                                                 │     Texto branco
└─────────────────────────────────────────────────┘
```

**Cores:**
- Fundo: `bg-primary` (roxo #8B5CF6)
- Texto: `text-primary-foreground` (branco #FFFFFF)
- Todos os ícones: branco
- Hover: `bg-primary/80` (roxo 80% opacidade)

---

### 2. Item Normal (Não Selecionado)

**Quando:** `value !== id`

**Classes Aplicadas:**
```tsx
<CommandItem>
  {/* Ícone do modelo */}
  <ModelIcon />
  
  {/* Nome do modelo */}
  <span>Flux Dev</span>
  
  {/* Ícone de moeda */}
  <Coins className="text-muted-foreground" />
  
  {/* Custo */}
  <span className="text-muted-foreground">0.025</span>
  
  {/* Indicador de bracket */}
  {getCostBracketIcon(bracket)} {/* Cor específica */}
</CommandItem>
```

**Resultado Visual (Tema Claro):**
```
┌─────────────────────────────────────────────────┐
│ 🎨 Flux Dev                  💰 0.025 ⬇️        │  ← Fundo branco
│                              ↑ cinza  ↑ azul    │     Texto preto
└─────────────────────────────────────────────────┘
```

**Resultado Visual (Tema Escuro):**
```
┌─────────────────────────────────────────────────┐
│ 🎨 Flux Dev                  💰 0.025 ⬇️        │  ← Fundo escuro
│                              ↑ cinza  ↑ azul    │     Texto branco
└─────────────────────────────────────────────────┘
```

**Cores:**
- Fundo: transparente/padrão
- Texto principal: cor padrão do tema
- Ícone de moeda: `text-muted-foreground` (cinza)
- Custo: `text-muted-foreground` (cinza)
- Indicador de bracket: cor específica do bracket

---

### 3. Item em Hover (Não Selecionado)

**Quando:** Mouse sobre item não selecionado

**Classes Aplicadas:**
```tsx
<CommandItem>
  {/* CommandItem aplica automaticamente: */}
  {/* bg-accent text-accent-foreground */}
</CommandItem>
```

**Resultado Visual (Tema Claro):**
```
┌─────────────────────────────────────────────────┐
│ 🎨 Flux Schnell              💰 0.003 ⬇️⬇️      │  ← Fundo cinza claro
│                                                 │     Texto escuro
└─────────────────────────────────────────────────┘
```

**Resultado Visual (Tema Escuro):**
```
┌─────────────────────────────────────────────────┐
│ 🎨 Flux Schnell              💰 0.003 ⬇️⬇️      │  ← Fundo cinza escuro
│                                                 │     Texto claro
└─────────────────────────────────────────────────┘
```

**Cores:**
- Fundo: `bg-accent`
- Texto: `text-accent-foreground`
- Transição suave
- Cursor: pointer

---

### 4. Item em Hover (Selecionado)

**Quando:** Mouse sobre item selecionado

**Classes Aplicadas:**
```tsx
<CommandItem
  className="data-[selected=true]:bg-primary/80"
>
</CommandItem>
```

**Resultado Visual:**
```
┌─────────────────────────────────────────────────┐
│ 🎨 Flux Pro 1.1              💰 0.055 ⬇️        │  ← Fundo roxo claro
│                                                 │     Texto branco
└─────────────────────────────────────────────────┘
```

**Cores:**
- Fundo: `bg-primary/80` (roxo 80% opacidade)
- Texto: permanece branco
- Transição suave

---

### 5. Item Desabilitado (Por Plano)

**Quando:** `getModelDisabled(model, plan) === true`

**Condições:**
- `model.disabled === true`, OU
- Plano hobby + `priceIndicator === 'high'` ou `'highest'`

**Classes Aplicadas:**
```tsx
<CommandItem disabled={true}>
  {/* CommandItem aplica automaticamente: */}
  {/* opacity-50 cursor-not-allowed pointer-events-none */}
</CommandItem>
```

**Resultado Visual:**
```
┌─────────────────────────────────────────────────┐
│ 🎨 Flux Pro 1.1 Ultra        💰 0.12 ⬆️⬆️       │  ← Opacidade 50%
│                                                 │     Cursor not-allowed
└─────────────────────────────────────────────────┘
     ↑ Texto e ícones desbotados
```

**Comportamento:**
- Opacidade reduzida (~50%)
- Cursor: not-allowed
- Não responde a hover
- Não pode ser clicado

---

## Indicadores de Bracket (Price Indicators)

### Lowest (Mais Barato)

**Ícone:** `ChevronsDownIcon` (⬇️⬇️)

**Cores:**
- Tema claro: `text-purple-500` (#A855F7)
- Tema escuro: `text-purple-400` (#C084FC)
- Quando selecionado: `text-primary-foreground` (branco)

**Tooltip:** "This model uses a lot less credits."

---

### Low (Barato)

**Ícone:** `ChevronDownIcon` (⬇️)

**Cores:**
- Tema claro: `text-blue-500` (#3B82F6)
- Tema escuro: `text-blue-400` (#60A5FA)
- Quando selecionado: `text-primary-foreground` (branco)

**Tooltip:** "This model uses less credits."

---

### High (Caro)

**Ícone:** `ChevronUpIcon` (⬆️)

**Cores:**
- Tema claro: `text-orange-500` (#F97316)
- Tema escuro: `text-orange-400` (#FB923C)
- Quando selecionado: `text-primary-foreground` (branco)

**Tooltip:** "This model uses more credits."

**Nota:** Desabilitado para plano hobby

---

### Highest (Mais Caro)

**Ícone:** `ChevronsUpIcon` (⬆️⬆️)

**Cores:**
- Tema claro: `text-red-500` (#EF4444)
- Tema escuro: `text-red-400` (#F87171)
- Quando selecionado: `text-primary-foreground` (branco)

**Tooltip:** "This model uses a lot of credits."

**Nota:** Desabilitado para plano hobby

---

## Formatação de Custos

### Função `formatCredits(cost: number)`

**Exemplos:**

| Custo (input) | Resultado (output) | Caso de Uso |
|---------------|-------------------|-------------|
| `0` | `"Grátis"` | Modelos gratuitos |
| `0.001` | `"<0.01"` | Custos muito baixos |
| `0.003` | `"0.003"` | Custos baixos |
| `0.025` | `"0.025"` | Custos médios |
| `0.055` | `"0.055"` | Custos médios-altos |
| `1` | `"1"` | Custos altos |
| `20` | `"20"` | Custos muito altos |

**Lógica:**
```typescript
const formatCredits = (cost: number): string => {
  if (cost === 0) return 'Grátis';
  if (cost < 0.01) return '<0.01';
  if (cost >= 1) return cost.toFixed(0);
  return cost.toFixed(3);
};
```

---

## Exemplos Completos

### Exemplo 1: Flux Pro 1.1 (Selecionado)

```tsx
<CommandItem
  value="fal-flux-pro-v11"
  className="bg-primary text-primary-foreground"
>
  <div className="flex flex-1 items-center gap-2">
    <ImageIcon className="text-primary-foreground" />
    <span>Flux Pro 1.1</span>
  </div>
  <div className="flex items-center gap-1">
    <Coins size={14} className="text-primary-foreground" />
    <span className="text-primary-foreground">0.055</span>
    <ChevronDownIcon className="text-primary-foreground" />
  </div>
</CommandItem>
```

**Visual:**
```
╔═════════════════════════════════════════════════╗
║ 🎨 Flux Pro 1.1              💰 0.055 ⬇️        ║  ← ROXO
╚═════════════════════════════════════════════════╝
```

---

### Exemplo 2: Flux Dev (Normal)

```tsx
<CommandItem value="fal-flux-dev">
  <div className="flex flex-1 items-center gap-2">
    <ImageIcon />
    <span>Flux Dev</span>
  </div>
  <div className="flex items-center gap-1">
    <Coins size={14} className="text-muted-foreground" />
    <span className="text-muted-foreground">0.025</span>
    <ChevronDownIcon className="text-blue-500" />
  </div>
</CommandItem>
```

**Visual:**
```
┌─────────────────────────────────────────────────┐
│ 🎨 Flux Dev                  💰 0.025 ⬇️        │  ← BRANCO
└─────────────────────────────────────────────────┘
```

---

### Exemplo 3: Flux Pro 1.1 Ultra (Desabilitado)

```tsx
<CommandItem
  value="fal-flux-pro-v11-ultra"
  disabled={true}
>
  <div className="flex flex-1 items-center gap-2">
    <ImageIcon />
    <span>Flux Pro 1.1 Ultra</span>
  </div>
  <div className="flex items-center gap-1">
    <Coins size={14} className="text-muted-foreground" />
    <span className="text-muted-foreground">0.12</span>
    <ChevronsUpIcon className="text-red-500" />
  </div>
</CommandItem>
```

**Visual:**
```
┌─────────────────────────────────────────────────┐
│ 🎨 Flux Pro 1.1 Ultra        💰 0.12 ⬆️⬆️       │  ← DESBOTADO
└─────────────────────────────────────────────────┘
     ↑ Opacidade 50%, cursor not-allowed
```

---

## Matriz de Estados

| Estado | Fundo | Texto Principal | Custo | Ícone Moeda | Bracket | Cursor |
|--------|-------|----------------|-------|-------------|---------|--------|
| **Selecionado** | `bg-primary` (roxo) | `text-primary-foreground` (branco) | branco | branco | branco | pointer |
| **Selecionado + Hover** | `bg-primary/80` (roxo claro) | branco | branco | branco | branco | pointer |
| **Normal** | transparente | padrão | cinza | cinza | cor específica | pointer |
| **Normal + Hover** | `bg-accent` (cinza) | `text-accent-foreground` | cinza | cinza | cor específica | pointer |
| **Desabilitado** | transparente | padrão (50%) | cinza (50%) | cinza (50%) | cor específica (50%) | not-allowed |

---

## Contraste WCAG AA

### Item Selecionado

**Combinação:** Roxo (#8B5CF6) + Branco (#FFFFFF)

- Ratio esperado: > 4.5:1 ✅
- Nível: AA (texto normal)
- Nível: AAA (texto grande)

### Item Normal (Tema Claro)

**Combinação:** Branco (#FFFFFF) + Preto (#000000)

- Ratio: 21:1 ✅
- Nível: AAA

**Custo (cinza):** Cinza (#71717A) + Branco (#FFFFFF)

- Ratio esperado: > 3:1 ✅
- Nível: AA (texto grande)

### Item Normal (Tema Escuro)

**Combinação:** Escuro (#09090B) + Branco (#FAFAFA)

- Ratio: > 15:1 ✅
- Nível: AAA

---

## Checklist de Validação Visual

### ✅ Tema Claro

- [x] Item selecionado: fundo roxo, texto branco
- [x] Item normal: fundo branco, texto preto, custo cinza
- [x] Hover (normal): fundo cinza claro
- [x] Hover (selecionado): fundo roxo claro
- [x] Desabilitado: opacidade 50%
- [x] Brackets: cores específicas visíveis
- [x] Contraste adequado em todos os estados

### ✅ Tema Escuro

- [x] Item selecionado: fundo roxo, texto branco
- [x] Item normal: fundo escuro, texto branco, custo cinza claro
- [x] Hover (normal): fundo cinza escuro
- [x] Hover (selecionado): fundo roxo claro
- [x] Desabilitado: opacidade 50%
- [x] Brackets: cores específicas (versão dark) visíveis
- [x] Contraste adequado em todos os estados

---

## Notas de Implementação

### Classes Tailwind Usadas

**Cores:**
- `bg-primary` - Fundo roxo
- `text-primary-foreground` - Texto branco
- `text-muted-foreground` - Texto cinza
- `bg-accent` - Fundo de hover
- `text-accent-foreground` - Texto de hover

**Modificadores:**
- `dark:` - Variante para tema escuro
- `data-[selected=true]:` - Estado selecionado com hover
- `/80` - Opacidade 80%

**Utilitários:**
- `cn()` - Merge condicional de classes
- `size-4` - Tamanho de ícone (16px)
- `size={14}` - Tamanho de ícone Coins (14px)
- `shrink-0` - Previne shrink em flex

### Comportamento do CommandItem

O componente `CommandItem` do shadcn/ui aplica automaticamente:

- Hover: `bg-accent text-accent-foreground`
- Disabled: `opacity-50 cursor-not-allowed pointer-events-none`
- Selected: pode ser sobrescrito com className

---

## Referências

- Componente: `components/nodes/model-selector.tsx`
- Requirements: `.kiro/specs/model-selector-improvements/requirements.md` (Requirement 3.4)
- Design: `.kiro/specs/model-selector-improvements/design.md`
- Teste Automatizado: `.kiro/specs/model-selector-improvements/test-visual-states.js`
- WCAG Guidelines: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
