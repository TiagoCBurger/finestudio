# Teste de Estado Selecionado - Model Selector

## Objetivo
Verificar que o custo e ícone de moeda têm cores apropriadas quando o item está selecionado.

## Implementação Atual

### Elementos com `text-primary-foreground` quando selecionado:

1. **Container do item** (linha 207-213)
   ```typescript
   className={cn(
     value === id &&
     'bg-primary text-primary-foreground data-[selected=true]:bg-primary/80 data-[selected=true]:text-primary-foreground'
   )}
   ```

2. **Ícone do modelo** (linha 219-221)
   ```typescript
   className={
     value === id ? 'text-primary-foreground' : ''
   }
   ```

3. **Ícone de moeda (Coins)** (linha 228-236)
   ```typescript
   className={cn(
     'shrink-0',
     value === id
       ? 'text-primary-foreground'
       : 'text-muted-foreground'
   )}
   ```

4. **Texto do custo** (linha 237-245)
   ```typescript
   className={cn(
     'text-sm',
     value === id
       ? 'text-primary-foreground'
       : 'text-muted-foreground'
   )}
   ```

5. **Ícone de bracket de preço** (linha 252-254)
   ```typescript
   getCostBracketIcon(
     model.priceIndicator,
     value === id ? 'text-primary-foreground' : ''
   )
   ```

## Checklist de Teste Manual

### Tema Claro
- [ ] Abrir seletor de modelo
- [ ] Verificar que o item selecionado tem fundo `bg-primary`
- [ ] Verificar que o ícone de moeda está visível e legível
- [ ] Verificar que o texto do custo está visível e legível
- [ ] Verificar que o ícone de bracket está visível (se presente)
- [ ] Verificar contraste adequado entre texto e fundo

### Tema Escuro
- [ ] Alternar para tema escuro
- [ ] Abrir seletor de modelo
- [ ] Verificar que o item selecionado tem fundo `bg-primary`
- [ ] Verificar que o ícone de moeda está visível e legível
- [ ] Verificar que o texto do custo está visível e legível
- [ ] Verificar que o ícone de bracket está visível (se presente)
- [ ] Verificar contraste adequado entre texto e fundo

### Estados de Hover
- [ ] Passar mouse sobre item não selecionado
- [ ] Verificar que o estado de hover não conflita com cores
- [ ] Passar mouse sobre item selecionado
- [ ] Verificar que `data-[selected=true]:bg-primary/80` funciona corretamente

## Resultado Esperado

Quando um item está selecionado (`value === id`):
- ✅ Fundo: `bg-primary` (cor primária do tema)
- ✅ Todos os textos e ícones: `text-primary-foreground` (cor de contraste)
- ✅ Legibilidade mantida em ambos os temas (claro e escuro)
- ✅ Contraste adequado (WCAG AA mínimo)

## Status

✅ **IMPLEMENTADO** - Todos os elementos já aplicam `text-primary-foreground` quando selecionados.

A implementação está completa e segue as melhores práticas de acessibilidade do shadcn/ui.
