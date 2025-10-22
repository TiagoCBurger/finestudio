# 🧪 Guia de Teste: Validação da Correção de Toast de Erro Falso

## Objetivo

Validar que os toasts de erro falsos foram completamente eliminados durante a geração de imagens com nano-banana e nano-banana-edit.

## Pré-requisitos

- ✅ Servidor Next.js rodando
- ✅ Ngrok tunnel ativo (para webhooks)
- ✅ Console do navegador aberto (F12)
- ✅ Projeto aberto no canvas

## Cenários de Teste

### ✅ Teste 1: Geração Normal (Cenário Principal)

**Objetivo:** Verificar que nenhum toast de erro aparece durante geração normal.

**Passos:**
1. Abrir console do navegador (F12)
2. Criar um nó de texto com prompt
3. Conectar a um nó de imagem (nano-banana ou nano-banana-edit)
4. Clicar no botão de gerar (▶️)
5. Observar o comportamento

**Resultado Esperado:**
- ✅ Nó entra em estado de loading imediatamente
- ✅ Skeleton com spinner aparece
- ✅ Mensagem "Generating..." é exibida
- ✅ **NENHUM toast de erro aparece**
- ✅ **NENHUM "?" aparece no lugar da imagem**
- ✅ Após alguns segundos, imagem aparece automaticamente
- ✅ Toast de sucesso "Image generated successfully" aparece **UMA VEZ**

**Logs Esperados no Console:**
```
🔄 Modo webhook ativado, request_id: kie-abc-123
⏳ Aguardando webhook completar...
🔍 [ImageNode] State check: { nodeId: '...', hasLoadingFlag: true, ... }
🔄 [ImageNode] Ativando loading state (status persistido no nó)
✅ [ImageNode] Webhook completou, URL recebida: https://...
🔄 Starting to load image: https://...
✅ Image loaded successfully: https://...
```

**Logs que NÃO devem aparecer:**
```
❌ Failed to load image  // ← NÃO DEVE APARECER
❌ Error generating image  // ← NÃO DEVE APARECER
```

---

### ✅ Teste 2: Reload Durante Geração

**Objetivo:** Verificar que estado persiste após reload e nenhum erro falso aparece.

**Passos:**
1. Iniciar geração de imagem
2. **Antes da imagem aparecer**, recarregar a página (F5 ou Cmd+R)
3. Observar o comportamento

**Resultado Esperado:**
- ✅ Após reload, nó continua em estado de loading
- ✅ **NENHUM toast de erro aparece**
- ✅ **NENHUM "?" aparece**
- ✅ Quando webhook completar, imagem aparece automaticamente
- ✅ Toast de sucesso aparece **UMA VEZ**

**Logs Esperados no Console:**
```
🔍 [ImageNode] State check: { hasLoadingFlag: true, nodeStatus: 'generating', ... }
🔄 [ImageNode] Ativando loading state (status persistido no nó)
✅ [ImageNode] Webhook completou, URL recebida: https://...
```

---

### ✅ Teste 3: Múltiplas Gerações Consecutivas

**Objetivo:** Verificar que não há toasts duplicados ou erros falsos em múltiplas gerações.

**Passos:**
1. Gerar primeira imagem
2. Aguardar completar
3. Gerar segunda imagem (regenerar)
4. Aguardar completar
5. Gerar terceira imagem
6. Observar comportamento

**Resultado Esperado:**
- ✅ Cada geração funciona independentemente
- ✅ **NENHUM toast duplicado**
- ✅ **NENHUM erro falso**
- ✅ Toast de sucesso aparece **UMA VEZ** por geração
- ✅ Estado sempre consistente

---

### ✅ Teste 4: Remover Nó Durante Geração

**Objetivo:** Verificar que remover nó durante geração não gera toast de erro.

**Passos:**
1. Iniciar geração de imagem
2. **Antes da imagem aparecer**, deletar o nó (Delete ou Backspace)
3. Aguardar webhook completar (verificar logs do servidor)
4. Observar comportamento

**Resultado Esperado:**
- ✅ Nó é removido imediatamente
- ✅ **NENHUM toast de erro aparece**
- ✅ Webhook completa normalmente (logs do servidor)
- ✅ Job marcado como completed silenciosamente

**Logs Esperados no Console:**
```
⚠️ Erro ignorado (falso positivo confirmado): Node not found
```

**Logs Esperados no Servidor:**
```
⚠️ Target node not found: ...
⚠️ The node may have been deleted after the job was created
✅ Marking job as completed (silently) to avoid false error notifications
```

---

### ✅ Teste 5: Abrir em Múltiplas Janelas

**Objetivo:** Verificar sincronização via Realtime em múltiplas janelas.

**Passos:**
1. Abrir projeto em duas janelas/abas diferentes
2. Na janela 1, iniciar geração de imagem
3. Observar comportamento em ambas as janelas

**Resultado Esperado:**
- ✅ Ambas as janelas mostram loading state
- ✅ **NENHUM toast de erro em nenhuma janela**
- ✅ Quando webhook completar, imagem aparece em ambas as janelas
- ✅ Toast de sucesso aparece **UMA VEZ** em cada janela

---

### ✅ Teste 6: Erro Real de Rede (Opcional)

**Objetivo:** Verificar que erros reais são mostrados corretamente.

**Passos:**
1. Desconectar internet (ou desativar ngrok tunnel)
2. Tentar gerar imagem
3. Observar comportamento

**Resultado Esperado:**
- ✅ Toast de erro é mostrado (erro real)
- ✅ Mensagem clara sobre o problema
- ✅ Loading para
- ✅ Usuário pode tentar novamente

**Logs Esperados no Console:**
```
❌ Erro real na geração: network error
[Toast exibido: "Error generating image"]
```

---

## Checklist de Validação

Após executar todos os testes, verificar:

- [ ] **Teste 1:** Nenhum toast de erro durante geração normal
- [ ] **Teste 1:** Nenhum "?" aparece no lugar da imagem
- [ ] **Teste 1:** Toast de sucesso aparece apenas UMA VEZ
- [ ] **Teste 2:** Reload não causa erros falsos
- [ ] **Teste 2:** Estado persiste corretamente
- [ ] **Teste 3:** Múltiplas gerações funcionam sem duplicatas
- [ ] **Teste 4:** Nó removido não gera toast de erro
- [ ] **Teste 5:** Múltiplas janelas sincronizam corretamente
- [ ] **Teste 6:** Erros reais são mostrados corretamente

---

## Logs de Debug Úteis

### Console do Navegador

Para ver logs detalhados, abrir console (F12) e filtrar por:
- `ImageNode` - Logs do componente de imagem
- `Webhook` - Logs de webhook
- `Erro` - Logs de erro

### Servidor Next.js

Logs importantes para monitorar:
```bash
# Webhook recebido
🔔 KIE.ai webhook received (raw)
🔔 KIE.ai webhook parsed

# Processamento
✅ Job completed successfully, processing result...
🖼️ Extracted image URL
📤 Uploading image to storage...
✅ Image uploaded to storage

# Atualização do projeto
🔄 Calling updateProjectNode...
📝 Updating project node with permanent URL...
✅ Project node updated successfully, realtime should trigger now
```

---

## Problemas Conhecidos (Resolvidos)

### ❌ Problema 1: Toast de Erro Falso
**Status:** ✅ RESOLVIDO
**Solução:** Tratamento inteligente de erros com filtros de falsos positivos

### ❌ Problema 2: "?" no Lugar da Imagem
**Status:** ✅ RESOLVIDO
**Solução:** Validação de URL antes de renderizar componente Image

### ❌ Problema 3: Toast Duplicado
**Status:** ✅ RESOLVIDO
**Solução:** Removido toast do queue monitor, mantido apenas no componente

---

## Reportar Problemas

Se encontrar algum problema durante os testes:

1. **Capturar logs do console** (F12 → Console → Copiar tudo)
2. **Capturar logs do servidor** (Terminal do Next.js)
3. **Descrever o cenário** (qual teste estava executando)
4. **Capturar screenshot** (se aplicável)

### Informações Úteis para Debug

```javascript
// No console do navegador, executar:
localStorage.getItem('debug') // Ver se debug está ativado
```

---

## Conclusão

Se todos os testes passarem com os resultados esperados, a correção está funcionando corretamente e o problema de toasts de erro falsos foi completamente eliminado! 🎉

### Próximos Passos

Após validação bem-sucedida:
1. ✅ Marcar issue como resolvida
2. ✅ Documentar solução (já feito em `SOLUCAO_TOAST_ERRO_FALSO.md`)
3. ✅ Monitorar em produção por alguns dias
4. ✅ Aplicar mesma solução para outros tipos de nós (vídeo, etc) se necessário
