# Visual Test Checklist - Task 9

## Objetivo
Verificar visualmente o layout e formatação de custos no seletor de modelos.

---

## Pré-requisitos
1. Aplicação rodando localmente
2. Navegador aberto (Chrome/Firefox/Safari)
3. Acesso a uma página com seletor de modelos (ex: geração de imagem, texto, etc.)

---

## Testes Visuais

### 1. Ícone de Moeda (Req 2.1)

**Passos:**
1. Abrir o seletor de modelos
2. Observar cada item da lista

**Verificar:**
- [ ] Ícone de moeda (Coins) aparece ao lado de cada custo
- [ ] Ícone tem tamanho apropriado (14px)
- [ ] Ícone está visível em modo claro
- [ ] Ícone está visível em modo escuro
- [ ] Cor do ícone muda quando item está selecionado

**Screenshot:** (Anexar se possível)

---

### 2. Formatação de Custos (Req 2.2, 2.4)

**Passos:**
1. Abrir o seletor de modelos
2. Procurar modelos com diferentes custos

**Verificar:**
- [ ] Modelos gratuitos mostram "Grátis"
- [ ] Custos < 0.01 mostram "<0.01"
- [ ] Custos entre 0.01 e 0.999 mostram 3 casas decimais (ex: "0.025")
- [ ] Custos >= 1 mostram números inteiros (ex: "1", "20")
- [ ] Formatação é consistente em todos os modelos

**Exemplos encontrados:**
- Custo 0: _______________
- Custo < 0.01: _______________
- Custo 0.025: _______________
- Custo 1: _______________
- Custo > 1: _______________

---

### 3. Alinhamento do Layout (Req 3.2, 3.3)

**Passos:**
1. Abrir o seletor de modelos
2. Observar o alinhamento dos elementos

**Verificar:**
- [ ] Nome do modelo está alinhado à esquerda
- [ ] Ícone do modelo aparece antes do nome
- [ ] Custo e ícone de moeda estão alinhados à direita
- [ ] Indicador de bracket (setas) aparece após o custo
- [ ] Espaçamento entre elementos é consistente
- [ ] Layout não quebra com nomes longos

**Screenshot:** (Anexar se possível)

---

### 4. Provider Icons (Req 3.1)

**Passos:**
1. Abrir o seletor de modelos
2. Observar os ícones exibidos

**Verificar:**
- [ ] Modelos com ícone próprio mostram seu ícone
- [ ] Modelos sem ícone próprio mostram... (anotar o que aparece)
- [ ] Não há ícones duplicados ou redundantes
- [ ] Não há ícones de provider em círculo

**Observações:**
_______________________________________________
_______________________________________________

---

### 5. Responsividade (Req 3.3)

**Passos:**
1. Abrir o seletor de modelos
2. Redimensionar a janela do navegador
3. Testar em diferentes tamanhos

**Verificar:**
- [ ] Layout funciona em tela grande (>1200px)
- [ ] Layout funciona em tela média (768px-1200px)
- [ ] Layout funciona em tela pequena (<768px)
- [ ] Nomes longos são truncados com "..."
- [ ] Ícones mantêm tamanho fixo
- [ ] Custo permanece visível e alinhado à direita

**Screenshot em diferentes tamanhos:** (Anexar se possível)

---

### 6. Estado Selecionado (Req 3.4)

**Passos:**
1. Abrir o seletor de modelos
2. Selecionar diferentes modelos
3. Observar as mudanças visuais

**Verificar:**
- [ ] Item selecionado tem fundo roxo (primary)
- [ ] Texto do nome fica branco quando selecionado
- [ ] Ícone de moeda fica branco quando selecionado
- [ ] Texto do custo fica branco quando selecionado
- [ ] Indicador de bracket fica branco quando selecionado
- [ ] Contraste é suficiente para leitura
- [ ] Hover funciona corretamente

**Screenshot do item selecionado:** (Anexar se possível)

---

### 7. Indicadores de Bracket (Req 4.1, 4.2, 4.3)

**Passos:**
1. Abrir o seletor de modelos
2. Procurar modelos com diferentes brackets
3. Passar o mouse sobre os indicadores

**Verificar:**
- [ ] Modelos com `priceIndicator` mostram setas
- [ ] "lowest" = setas duplas para baixo (roxo)
- [ ] "low" = seta simples para baixo (azul)
- [ ] "high" = seta simples para cima (laranja)
- [ ] "highest" = setas duplas para cima (vermelho)
- [ ] Tooltip aparece ao passar o mouse
- [ ] Tooltip mostra descrição correta do bracket
- [ ] Modelos sem indicador têm espaço reservado (alinhamento)

**Exemplos encontrados:**
- Lowest: _______________
- Low: _______________
- High: _______________
- Highest: _______________

---

### 8. Modo Claro vs Escuro

**Passos:**
1. Testar todos os itens acima em modo claro
2. Alternar para modo escuro
3. Testar todos os itens novamente

**Verificar:**
- [ ] Cores são apropriadas em modo claro
- [ ] Cores são apropriadas em modo escuro
- [ ] Contraste é suficiente em ambos os modos
- [ ] Ícones são visíveis em ambos os modos
- [ ] Estado selecionado é claro em ambos os modos

---

## Bugs Encontrados

### Bug 1
**Descrição:** _______________________________________________
**Severidade:** [ ] Crítico [ ] Alto [ ] Médio [ ] Baixo
**Screenshot:** _______________________________________________

### Bug 2
**Descrição:** _______________________________________________
**Severidade:** [ ] Crítico [ ] Alto [ ] Médio [ ] Baixo
**Screenshot:** _______________________________________________

---

## Resultado Final

**Status Geral:** [ ] ✅ Passou [ ] ⚠️ Passou com observações [ ] ❌ Falhou

**Observações:**
_______________________________________________
_______________________________________________
_______________________________________________

**Testado por:** _______________
**Data:** _______________
**Navegador:** _______________
**Resolução:** _______________
