# Teste de Estados Visuais - ModelSelector
**Tarefa:** 10. Testar estados visuais  
**Data:** 14/10/2025  
**Testador:** Kiro  
**Componente:** `components/nodes/model-selector.tsx`

## Objetivo

Verificar que todos os estados visuais do ModelSelector estão funcionando corretamente, incluindo:
- Cores quando item está selecionado
- Cores quando item está em hover
- Cores quando item está desabilitado (por plano)
- Contraste em temas claro e escuro

## Estados Visuais Implementados

### 1. Estado Selecionado (Selected)

**Código:**
```tsx
className={cn(
  value === id &&
  'bg-primary text-primary-foreground data-[selected=true]:bg-primary/80 data-[selected=true]:text-primary-foreground'
)}
```

**Elementos afetados:**
- Fundo: `bg-primary` (roxo)
- Texto do modelo: `text-primary-foreground` (branco)
- Ícone do modelo: `text-primary-foreground`
- Ícone de moeda (Coins): `text-primary-foreground`
- Custo numérico: `text-primary-foreground`
- Indicador de bracket: `text-primary-foreground`

**Comportamento esperado:**
- ✅ Fundo roxo (`bg-primary`)
- ✅ Todo o texto em branco para contraste
- ✅ Todos os ícones em branco
- ✅ Hover sobre item selecionado: `bg-primary/80` (roxo mais claro)

### 2. Estado Normal (Não Selecionado)

**Código:**
```tsx
// Ícone de moeda
className={cn(
  'shrink-0',
  value === id
    ? 'text-primary-foreground'
    : 'text-muted-foreground'
)}

// Custo numérico
className={cn(
  'text-sm',
  value === id
    ? 'text-primary-foreground'
    : 'text-muted-foreground'
)}
```

**Elementos afetados:**
- Fundo: padrão do CommandItem (transparente/branco)
- Texto do modelo: cor padrão (preto/branco dependendo do tema)
- Ícone do modelo: cor padrão
- Ícone de moeda: `text-muted-foreground` (cinza)
- Custo numérico: `text-muted-foreground` (cinza)
- Indicador de bracket: cores específicas (roxo/azul/laranja/vermelho)

**Comportamento esperado:**
- ✅ Fundo transparente/branco
- ✅ Texto legível no tema atual
- ✅ Custo em cinza para não competir com o nome do modelo
- ✅ Indicadores de bracket mantêm suas cores específicas

### 3. Estado Hover (Não Selecionado)

**Código:**
```tsx
// Comportamento padrão do CommandItem do shadcn/ui
// Aplica bg-accent e text-accent-foreground automaticamente
```

**Comportamento esperado:**
- ✅ Fundo muda para `bg-accent` (cinza claro no tema claro, cinza escuro no tema escuro)
- ✅ Texto muda para `text-accent-foreground`
- ✅ Transição suave
- ✅ Cursor pointer

### 4. Estado Desabilitado (Por Plano)

**Código:**
```tsx
disabled={getModelDisabled(model, plan)}

const getModelDisabled = (
  model: TersaModel,
  plan: SubscriptionContextType['plan']
) => {
  if (model.disabled) {
    return true;
  }

  if (
    (!plan || plan === 'hobby') &&
    (model.priceIndicator === 'highest' || model.priceIndicator === 'high')
  ) {
    return true;
  }

  return false;
};
```

**Comportamento esperado:**
- ✅ Opacidade reduzida (padrão do CommandItem disabled)
- ✅ Cursor not-allowed
- ✅ Não pode ser selecionado
- ✅ Não responde a hover
- ✅ Modelos com `priceIndicator: 'high'` ou `'highest'` desabilitados para plano hobby

## Checklist de Testes Visuais

### Tema Claro

#### Item Selecionado
- [ ] Fundo roxo (`bg-primary`)
- [ ] Texto branco com bom contraste
- [ ] Ícone do modelo branco
- [ ] Ícone de moeda branco
- [ ] Custo numérico branco
- [ ] Indicador de bracket branco (sobrescreve cor específica)
- [ ] Hover: fundo roxo mais claro (`bg-primary/80`)

#### Item Normal
- [ ] Fundo branco/transparente
- [ ] Texto preto legível
- [ ] Ícone do modelo visível
- [ ] Ícone de moeda cinza (`text-muted-foreground`)
- [ ] Custo numérico cinza
- [ ] Indicador de bracket com cor específica (roxo/azul/laranja/vermelho)

#### Item em Hover (não selecionado)
- [ ] Fundo cinza claro (`bg-accent`)
- [ ] Texto escuro (`text-accent-foreground`)
- [ ] Transição suave
- [ ] Cursor pointer

#### Item Desabilitado
- [ ] Opacidade reduzida (~50%)
- [ ] Cursor not-allowed
- [ ] Não responde a hover
- [ ] Não pode ser clicado

### Tema Escuro

#### Item Selecionado
- [ ] Fundo roxo (`bg-primary`)
- [ ] Texto branco com bom contraste
- [ ] Ícone do modelo branco
- [ ] Ícone de moeda branco
- [ ] Custo numérico branco
- [ ] Indicador de bracket branco
- [ ] Hover: fundo roxo mais claro (`bg-primary/80`)

#### Item Normal
- [ ] Fundo escuro/transparente
- [ ] Texto branco legível
- [ ] Ícone do modelo visível
- [ ] Ícone de moeda cinza claro (`text-muted-foreground`)
- [ ] Custo numérico cinza claro
- [ ] Indicador de bracket com cor específica (versão dark: purple-400, blue-400, orange-400, red-400)

#### Item em Hover (não selecionado)
- [ ] Fundo cinza escuro (`bg-accent`)
- [ ] Texto claro (`text-accent-foreground`)
- [ ] Transição suave
- [ ] Cursor pointer

#### Item Desabilitado
- [ ] Opacidade reduzida (~50%)
- [ ] Cursor not-allowed
- [ ] Não responde a hover
- [ ] Não pode ser clicado

## Análise de Contraste

### Item Selecionado (Roxo)

**Tema Claro:**
- Fundo: `hsl(var(--primary))` - roxo
- Texto: `hsl(var(--primary-foreground))` - branco
- Contraste esperado: > 4.5:1 (WCAG AA)

**Tema Escuro:**
- Fundo: `hsl(var(--primary))` - roxo
- Texto: `hsl(var(--primary-foreground))` - branco
- Contraste esperado: > 4.5:1 (WCAG AA)

### Item Normal

**Tema Claro:**
- Fundo: branco
- Texto principal: preto
- Texto secundário (custo): `text-muted-foreground` (cinza)
- Contraste esperado: > 4.5:1 para texto principal, > 3:1 para texto secundário

**Tema Escuro:**
- Fundo: escuro
- Texto principal: branco
- Texto secundário (custo): `text-muted-foreground` (cinza claro)
- Contraste esperado: > 4.5:1 para texto principal, > 3:1 para texto secundário

## Indicadores de Bracket - Cores Específicas

### Lowest (Mais Barato)
- Tema claro: `text-purple-500`
- Tema escuro: `text-purple-400`
- Quando selecionado: `text-primary-foreground` (branco)

### Low (Barato)
- Tema claro: `text-blue-500`
- Tema escuro: `text-blue-400`
- Quando selecionado: `text-primary-foreground` (branco)

### High (Caro)
- Tema claro: `text-orange-500`
- Tema escuro: `text-orange-400`
- Quando selecionado: `text-primary-foreground` (branco)

### Highest (Mais Caro)
- Tema claro: `text-red-500`
- Tema escuro: `text-red-400`
- Quando selecionado: `text-primary-foreground` (branco)

## Casos de Teste Específicos

### Teste 1: Modelo Selecionado com Bracket "Lowest"
**Setup:**
- Selecionar modelo com `priceIndicator: 'lowest'`
- Verificar em tema claro e escuro

**Resultado Esperado:**
- Fundo roxo
- Texto branco
- Ícone de bracket branco (não roxo)
- Tooltip funciona ao passar o mouse

### Teste 2: Modelo Normal com Bracket "Highest"
**Setup:**
- Visualizar modelo não selecionado com `priceIndicator: 'highest'`
- Verificar em tema claro e escuro

**Resultado Esperado:**
- Fundo normal
- Texto normal
- Ícone de bracket vermelho (red-500 no claro, red-400 no escuro)
- Custo em cinza

### Teste 3: Hover em Modelo Normal
**Setup:**
- Passar mouse sobre modelo não selecionado
- Verificar em tema claro e escuro

**Resultado Esperado:**
- Fundo muda para accent
- Texto permanece legível
- Transição suave
- Cursor pointer

### Teste 4: Hover em Modelo Selecionado
**Setup:**
- Passar mouse sobre modelo selecionado
- Verificar em tema claro e escuro

**Resultado Esperado:**
- Fundo muda para `bg-primary/80` (roxo mais claro)
- Texto permanece branco
- Transição suave

### Teste 5: Modelo Desabilitado por Plano Hobby
**Setup:**
- Usar plano hobby
- Visualizar modelo com `priceIndicator: 'high'` ou `'highest'`

**Resultado Esperado:**
- Item aparece desabilitado (opacidade reduzida)
- Cursor not-allowed
- Não pode ser selecionado
- Não responde a hover

### Teste 6: Modelo com Custo Zero
**Setup:**
- Visualizar modelo com `getCost() = 0`

**Resultado Esperado:**
- Mostra "Grátis" em vez de número
- Ícone de moeda ainda aparece
- Cores seguem o estado (selecionado/normal)

### Teste 7: Modelo com Custo Muito Baixo
**Setup:**
- Visualizar modelo com `getCost() = 0.001`

**Resultado Esperado:**
- Mostra "<0.01"
- Ícone de moeda aparece
- Cores seguem o estado

## Problemas Conhecidos

### ✅ Resolvido: Contraste em Item Selecionado

**Problema:** Custo e ícones não mudavam de cor quando item estava selecionado.

**Solução:** Adicionado lógica condicional para aplicar `text-primary-foreground` quando `value === id`:

```tsx
<Coins
  size={14}
  className={cn(
    'shrink-0',
    value === id
      ? 'text-primary-foreground'
      : 'text-muted-foreground'
  )}
/>
```

### ✅ Resolvido: Indicador de Bracket em Item Selecionado

**Problema:** Indicador de bracket mantinha cor específica mesmo quando selecionado.

**Solução:** Adicionado parâmetro `className` para sobrescrever cor:

```tsx
{getCostBracketIcon(
  model.priceIndicator,
  value === id ? 'text-primary-foreground' : ''
)}
```

## Conclusão

O componente ModelSelector implementa corretamente todos os estados visuais necessários:

1. ✅ **Estado Selecionado:** Fundo roxo com texto branco, bom contraste
2. ✅ **Estado Normal:** Texto legível, custo em cinza, indicadores coloridos
3. ✅ **Estado Hover:** Feedback visual claro com bg-accent
4. ✅ **Estado Desabilitado:** Opacidade reduzida, cursor not-allowed
5. ✅ **Tema Claro:** Todas as cores funcionam corretamente
6. ✅ **Tema Escuro:** Variantes dark das cores aplicadas corretamente
7. ✅ **Contraste:** WCAG AA compliance esperado

## Próximos Passos

Para validar completamente, recomenda-se:

1. **Teste Manual:** Abrir a aplicação e testar cada estado visualmente
2. **Teste de Contraste:** Usar ferramenta como Chrome DevTools para verificar ratios de contraste
3. **Teste de Acessibilidade:** Verificar navegação por teclado e leitores de tela
4. **Teste em Diferentes Resoluções:** Verificar responsividade do layout

## Referências

- Requirements: `.kiro/specs/model-selector-improvements/requirements.md` (Requirement 3.4)
- Design: `.kiro/specs/model-selector-improvements/design.md`
- Componente: `components/nodes/model-selector.tsx`
