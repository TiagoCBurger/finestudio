# 🚀 Guia Rápido de Teste - Task 9

**Tempo estimado:** 5-10 minutos

---

## Como Testar

### 1. Iniciar a Aplicação
```bash
pnpm dev
```

### 2. Navegar para Página com Seletor de Modelos
- Ir para qualquer página de geração (imagem, vídeo, etc.)
- Localizar o seletor de modelos (botão dropdown)

### 3. Abrir o Seletor
- Clicar no botão do seletor
- O modal deve abrir mostrando a lista de modelos

---

## ✅ Checklist Rápido (2 minutos)

### Visual Básico
- [ ] Ícone de moeda (💰) aparece ao lado de cada custo
- [ ] Custos estão alinhados à direita
- [ ] Nomes dos modelos estão à esquerda
- [ ] Layout não está quebrado

### Formatação de Custos
- [ ] Procurar "nano-banana" → deve mostrar "<0.01"
- [ ] Procurar "flux/dev" → deve mostrar "0.025"
- [ ] Procurar "minimax" → deve mostrar "0.430"
- [ ] Procurar "luma-photon" → deve mostrar "1"

### Estado Selecionado
- [ ] Clicar em um modelo
- [ ] Fundo fica roxo (primary)
- [ ] Texto fica branco
- [ ] Custo permanece legível

### Responsividade
- [ ] Redimensionar janela
- [ ] Nomes longos são truncados com "..."
- [ ] Layout não quebra

---

## 🔍 O Que Procurar

### ✅ Correto
```
[Ícone] Nome do Modelo                    💰 0.025 ↓
[Ícone] Outro Modelo                      💰 1
[Ícone] Modelo Barato                     💰 <0.01 ↓↓
```

### ❌ Incorreto
```
[Ícone] Nome do Modelo 💰 0.025000000001
[Ícone] Outro Modelo                 💰1
Nome do Modelo muito longo que não trunca 💰 0.025
```

---

## 🐛 Bugs Comuns a Verificar

1. **Custo não aparece**
   - Verificar se getCost() está definido no modelo

2. **Formatação errada**
   - Verificar se formatCredits() está sendo usado

3. **Alinhamento quebrado**
   - Verificar classes flex e gap

4. **Ícone não aparece**
   - Verificar import do Coins de lucide-react

5. **Cores erradas quando selecionado**
   - Verificar text-primary-foreground

---

## 📊 Modelos para Testar

### Imagem
- ✅ nano-banana/edit (0.001 → "<0.01") com indicador LOW
- ✅ flux/dev (0.025 → "0.025")
- ✅ gpt-image-edit (NÃO deve aparecer - enabled: false)

### Vídeo
- ✅ minimax (0.43 → "0.430")
- ✅ luma-photon (1.2 → "1")

---

## 🎨 Teste de Cores

### Modo Claro
- [ ] Ícone de moeda visível (cinza quando não selecionado)
- [ ] Custo legível (cinza quando não selecionado)
- [ ] Fundo roxo quando selecionado
- [ ] Texto branco quando selecionado

### Modo Escuro
- [ ] Ícone de moeda visível
- [ ] Custo legível
- [ ] Contraste adequado
- [ ] Cores dos indicadores visíveis (azul, roxo, laranja, vermelho)

---

## 📸 Screenshots Recomendados

1. **Seletor aberto** - Vista geral
2. **Item selecionado** - Fundo roxo
3. **Modelo com indicador** - nano-banana com seta azul
4. **Tela pequena** - Layout responsivo
5. **Modo escuro** - Contraste

---

## ⚡ Teste Rápido (30 segundos)

Se você tem pouco tempo, teste apenas:

1. ✅ Abrir seletor
2. ✅ Verificar que custos aparecem com ícone 💰
3. ✅ Verificar alinhamento (nome esquerda, custo direita)
4. ✅ Selecionar um modelo (fundo roxo)
5. ✅ Fechar seletor

Se tudo acima funciona, **Task 9 está OK!** ✅

---

## 🆘 Problemas?

Se encontrar bugs:
1. Anotar no `visual-test-checklist.md`
2. Capturar screenshot
3. Descrever o problema
4. Reportar severidade (crítico/alto/médio/baixo)

---

## ✅ Critério de Aprovação

Task 9 está aprovada se:
- ✅ Ícone de moeda aparece
- ✅ Custos estão formatados corretamente
- ✅ Alinhamento está correto
- ✅ Estado selecionado é legível
- ✅ Layout é responsivo

**Nota:** Issue de provider icons é menor e não bloqueia aprovação.

---

**Boa sorte com os testes!** 🎉
