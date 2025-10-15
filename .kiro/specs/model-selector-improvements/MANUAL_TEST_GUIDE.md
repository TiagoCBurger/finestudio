# Guia de Teste Manual - Estados Visuais do ModelSelector

**Objetivo:** Validar visualmente todos os estados do componente ModelSelector

## Pré-requisitos

1. Aplicação rodando em desenvolvimento
2. Acesso a um nó que use ModelSelector (ex: Image Transform)
3. Capacidade de alternar entre temas claro e escuro
4. Acesso a diferentes planos (hobby e pro) - opcional

## Teste Rápido (5 minutos)

### 1. Abrir o Seletor de Modelos

1. Navegue até um nó de transformação de imagem
2. Clique no botão de seleção de modelo
3. O diálogo deve abrir mostrando a lista de modelos

### 2. Verificar Item Selecionado

**O que verificar:**
- [ ] Fundo roxo
- [ ] Texto branco
- [ ] Ícone do modelo branco
- [ ] Ícone de moeda (💰) branco
- [ ] Custo numérico branco
- [ ] Indicador de bracket branco (se houver)

**Como testar:**
- O modelo atualmente selecionado deve estar destacado em roxo
- Todo o conteúdo do item deve estar em branco

### 3. Verificar Item Normal

**O que verificar:**
- [ ] Fundo branco/transparente
- [ ] Texto preto (tema claro) ou branco (tema escuro)
- [ ] Ícone de moeda cinza
- [ ] Custo numérico cinza
- [ ] Indicador de bracket colorido (roxo/azul/laranja/vermelho)

**Como testar:**
- Olhe para qualquer modelo não selecionado
- O custo deve estar em cinza, não competindo com o nome do modelo

### 4. Verificar Hover

**O que verificar:**
- [ ] Passar mouse sobre item não selecionado: fundo muda para cinza claro
- [ ] Passar mouse sobre item selecionado: fundo muda para roxo mais claro
- [ ] Transição suave
- [ ] Cursor pointer

**Como testar:**
- Passe o mouse lentamente sobre diferentes modelos
- Observe a mudança de cor do fundo

### 5. Verificar Indicadores de Bracket

**O que verificar:**
- [ ] Lowest (⬇️⬇️): roxo
- [ ] Low (⬇️): azul
- [ ] High (⬆️): laranja
- [ ] Highest (⬆️⬆️): vermelho
- [ ] Tooltip aparece ao passar o mouse

**Como testar:**
- Procure modelos com diferentes indicadores
- Passe o mouse sobre as setas para ver o tooltip

### 6. Verificar Tema Escuro

**O que verificar:**
- [ ] Alterne para tema escuro
- [ ] Item selecionado: ainda roxo com texto branco
- [ ] Item normal: fundo escuro, texto branco, custo cinza claro
- [ ] Brackets: cores mais claras (purple-400, blue-400, etc.)

**Como testar:**
- Use o toggle de tema da aplicação
- Verifique que todas as cores continuam legíveis

## Teste Completo (15 minutos)

### 7. Verificar Modelos Desabilitados (Plano Hobby)

**Pré-requisito:** Estar com plano hobby

**O que verificar:**
- [ ] Modelos com indicador "High" (⬆️) aparecem desabilitados
- [ ] Modelos com indicador "Highest" (⬆️⬆️) aparecem desabilitados
- [ ] Opacidade reduzida (~50%)
- [ ] Cursor not-allowed
- [ ] Não pode ser clicado

**Como testar:**
- Procure modelos caros (ex: Flux Pro 1.1 Ultra)
- Tente clicar neles (não deve funcionar)

### 8. Verificar Formatação de Custos

**O que verificar:**
- [ ] Custo zero: mostra "Grátis"
- [ ] Custo muito baixo (< 0.01): mostra "<0.01"
- [ ] Custo baixo (0.003): mostra "0.003"
- [ ] Custo médio (0.025): mostra "0.025"
- [ ] Custo alto (1+): mostra número inteiro

**Como testar:**
- Procure modelos com diferentes custos
- Verifique a formatação do número

### 9. Verificar Contraste

**Ferramentas:** Chrome DevTools

**Como testar:**
1. Abra Chrome DevTools (F12)
2. Vá para a aba "Elements"
3. Selecione um item do ModelSelector
4. Na aba "Styles", procure por "Contrast ratio"
5. Verifique que o ratio é > 4.5:1

**O que verificar:**
- [ ] Item selecionado: roxo + branco > 4.5:1
- [ ] Item normal: texto principal > 4.5:1
- [ ] Custo cinza: > 3:1 (texto secundário)

### 10. Verificar Navegação por Teclado

**O que verificar:**
- [ ] Tab: navega entre modelos
- [ ] Enter: seleciona modelo
- [ ] Esc: fecha o diálogo
- [ ] Setas: navega pela lista

**Como testar:**
1. Abra o seletor de modelos
2. Use apenas o teclado para navegar
3. Verifique que o foco é visível
4. Selecione um modelo com Enter

## Checklist de Validação Final

### Tema Claro ✅
- [ ] Item selecionado: roxo + branco
- [ ] Item normal: branco + preto + cinza
- [ ] Hover: feedback visual claro
- [ ] Desabilitado: opacidade reduzida
- [ ] Brackets: cores vibrantes

### Tema Escuro ✅
- [ ] Item selecionado: roxo + branco
- [ ] Item normal: escuro + branco + cinza claro
- [ ] Hover: feedback visual claro
- [ ] Desabilitado: opacidade reduzida
- [ ] Brackets: cores claras (dark variants)

### Acessibilidade ✅
- [ ] Contraste adequado (WCAG AA)
- [ ] Navegação por teclado funciona
- [ ] Foco visível
- [ ] Cursor apropriado (pointer/not-allowed)

### Funcionalidade ✅
- [ ] Seleção funciona
- [ ] Filtro de modelos desabilitados funciona
- [ ] Desabilitação por plano funciona
- [ ] Tooltips funcionam
- [ ] Busca funciona

## Problemas Comuns

### Problema: Custo não muda de cor quando selecionado
**Solução:** Verificar que a classe condicional está aplicada:
```tsx
className={value === id ? 'text-primary-foreground' : 'text-muted-foreground'}
```

### Problema: Bracket não muda de cor quando selecionado
**Solução:** Verificar que o parâmetro className está sendo passado:
```tsx
getCostBracketIcon(bracket, value === id ? 'text-primary-foreground' : '')
```

### Problema: Modelos desabilitados aparecem na lista
**Solução:** Verificar que o filtro está sendo aplicado:
```tsx
const enabledOptions = Object.fromEntries(
  Object.entries(options).filter(([_, model]) => model.enabled !== false)
);
```

### Problema: Contraste ruim em tema escuro
**Solução:** Verificar que as variantes dark estão sendo usadas:
```tsx
className="text-purple-500 dark:text-purple-400"
```

## Relatório de Teste

Após completar os testes, preencha:

**Data:** _______________  
**Testador:** _______________  
**Navegador:** _______________  
**Resolução:** _______________  

**Resultados:**
- [ ] Todos os testes passaram
- [ ] Alguns testes falharam (descrever abaixo)
- [ ] Problemas encontrados (descrever abaixo)

**Observações:**
_____________________________________
_____________________________________
_____________________________________

## Referências

- Componente: `components/nodes/model-selector.tsx`
- Teste Automatizado: `.kiro/specs/model-selector-improvements/test-visual-states.js`
- Guia de Referência: `.kiro/specs/model-selector-improvements/VISUAL_STATES_REFERENCE.md`
- Relatório Completo: `.kiro/specs/model-selector-improvements/TASK_10_COMPLETE.md`

---

**Tempo estimado:** 5-15 minutos  
**Dificuldade:** Fácil  
**Pré-requisitos:** Aplicação rodando
