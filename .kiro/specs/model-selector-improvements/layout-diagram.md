# 📐 Diagrama de Layout - Model Selector

## Layout Atual (Task 9 Implementado)

```
┌─────────────────────────────────────────────────────────────┐
│  Model Selector Dialog                                      │
├─────────────────────────────────────────────────────────────┤
│  🔍 Search for a model...                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Provider Group: OpenAI ─────────────────────────────┐  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ [🎨] GPT-4 Vision                    💰 0.025   │ │  │
│  │  │      ↑                                    ↑      │ │  │
│  │  │      │                                    │      │ │  │
│  │  │   Model Icon                          Cost Icon │ │  │
│  │  │   + Name                              + Value   │ │  │
│  │  │   (Left aligned)                  (Right align) │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Provider Group: Fal ─────────────────────────────────┐  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ [🎨] nano-banana/edit            💰 <0.01 ↓    │ │  │
│  │  │                                          ↑       │ │  │
│  │  │                                    Price Indicator│ │  │
│  │  │                                    (Low = Blue)  │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ [🎨] flux/dev                    💰 0.025       │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Anatomia de um Item

### Item Normal (Não Selecionado)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Icon] Model Name                    💰 0.025             │
│   ↑     ↑                              ↑   ↑               │
│   │     │                              │   │               │
│   │     └─ Text (truncate if long)    │   └─ Cost Value   │
│   │        Color: default              │      Color: muted │
│   │                                    │                   │
│   └─ Model/Provider Icon               └─ Coins Icon       │
│      Size: 16px (size-4)                  Size: 14px      │
│      Color: default                       Color: muted    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Item Selecionado

```
┌─────────────────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████████████████│
│ █                                                          █│
│ █ [Icon] Model Name                    💰 0.025          █│
│ █  ↑     ↑                              ↑   ↑            █│
│ █  │     │                              │   │            █│
│ █  │     └─ Text (white)                │   └─ Cost (white)█│
│ █  │        Color: primary-foreground   │                █│
│ █  │                                    │                █│
│ █  └─ Icon (white)                      └─ Icon (white)  █│
│ █     Color: primary-foreground            Color: primary-█│
│ █                                          foreground     █│
│ █                                                          █│
│ ████████████████████████████████████████████████████████████│
│ Background: primary (purple)                               │
└─────────────────────────────────────────────────────────────┘
```

### Item com Price Indicator

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Icon] Model Name              💰 0.001 ↓↓               │
│                                           ↑                │
│                                           │                │
│                                    Price Indicator         │
│                                    (Lowest = Purple)       │
│                                    With Tooltip            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Flexbox

```
CommandItem (flex container)
│
├─ Left Section (flex-1)
│  │
│  ├─ ModelIcon (shrink-0, size-4)
│  └─ Model Name (truncate)
│
└─ Right Section (flex, gap-1)
   │
   ├─ Coins Icon (shrink-0, size-14)
   ├─ Cost Value (text-sm)
   └─ Price Indicator (size-4) OR Spacer (size-4)
```

---

## Classes CSS Importantes

### Container
```tsx
<CommandItem className={cn(
  value === id && 
  'bg-primary text-primary-foreground'
)}>
```

### Left Section
```tsx
<div className="flex flex-1 items-center gap-2 overflow-hidden">
  <ModelIcon className="size-4 shrink-0" />
  <span className="block truncate">{model.label}</span>
</div>
```

### Right Section
```tsx
<div className="flex items-center gap-1">
  <Coins size={14} className={cn(
    'shrink-0',
    value === id 
      ? 'text-primary-foreground' 
      : 'text-muted-foreground'
  )} />
  <span className={cn(
    'text-sm',
    value === id 
      ? 'text-primary-foreground' 
      : 'text-muted-foreground'
  )}>
    {formatCredits(cost)}
  </span>
  {/* Price Indicator or Spacer */}
</div>
```

---

## Responsividade

### Desktop (> 1024px)
```
┌─────────────────────────────────────────────────────────────┐
│  [Icon] Very Long Model Name Here        💰 0.025          │
└─────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1024px)
```
┌───────────────────────────────────────────────────┐
│  [Icon] Very Long Model Name...   💰 0.025       │
└───────────────────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌─────────────────────────────────────────┐
│  [Icon] Very Long...    💰 0.025       │
└─────────────────────────────────────────┘
```

**Nota:** O texto é truncado com `...` mas o custo sempre permanece visível.

---

## Price Indicators

### Lowest (Purple)
```
💰 <0.01 ↓↓
        └─ ChevronsDownIcon
           Color: purple-500
           Tooltip: "This model uses a lot less credits."
```

### Low (Blue)
```
💰 0.025 ↓
        └─ ChevronDownIcon
           Color: blue-500
           Tooltip: "This model uses less credits."
```

### High (Orange)
```
💰 1.5 ↑
      └─ ChevronUpIcon
         Color: orange-500
         Tooltip: "This model uses more credits."
```

### Highest (Red)
```
💰 20 ↑↑
     └─ ChevronsUpIcon
        Color: red-500
        Tooltip: "This model uses a lot of credits."
```

---

## Spacing

```
┌─────────────────────────────────────────────────────────────┐
│  [Icon]─gap-2─[Name]─────flex-1─────[Coin]─gap-1─[Cost]   │
│   16px         text                   14px        text      │
└─────────────────────────────────────────────────────────────┘

Padding: CommandItem default (p-2)
Gap Left: 8px (gap-2)
Gap Right: 4px (gap-1)
```

---

## Estados Visuais

### Normal
- Background: transparent
- Text: default color
- Icons: default color
- Cost: muted-foreground

### Hover
- Background: accent (subtle)
- Text: accent-foreground
- Icons: accent-foreground
- Cost: accent-foreground

### Selected
- Background: primary (purple)
- Text: primary-foreground (white)
- Icons: primary-foreground (white)
- Cost: primary-foreground (white)

### Disabled
- Background: transparent
- Text: muted-foreground
- Icons: muted-foreground
- Cost: muted-foreground
- Opacity: 0.5
- Cursor: not-allowed

---

## Comparação: Antes vs Depois

### Antes (Sem Task 9)
```
┌─────────────────────────────────────────────────────────────┐
│  [Provider] [Icon] Model Name                              │
│   Logo                                                      │
│   (redundante)                                              │
└─────────────────────────────────────────────────────────────┘
```

### Depois (Com Task 9)
```
┌─────────────────────────────────────────────────────────────┐
│  [Icon] Model Name                    💰 0.025 ↓           │
│                                        ↑                    │
│                                   Custo claro               │
└─────────────────────────────────────────────────────────────┘
```

**Melhorias:**
- ✅ Provider logo redundante removido (parcialmente)
- ✅ Custo exato exibido com ícone
- ✅ Alinhamento claro (esquerda/direita)
- ✅ Indicadores de preço mantidos

---

## Acessibilidade

### Contraste
- Normal: Passa WCAG AA
- Selected: Passa WCAG AAA (fundo roxo + texto branco)
- Disabled: Passa WCAG AA

### Keyboard Navigation
- Tab: Navega entre itens
- Enter/Space: Seleciona item
- Esc: Fecha dialog

### Screen Readers
- Coins icon: aria-hidden (decorativo)
- Cost value: Lido como texto
- Price indicator: Tooltip fornece contexto

---

**Última atualização:** 14/10/2025
