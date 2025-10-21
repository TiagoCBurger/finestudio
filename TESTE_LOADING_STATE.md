# 🧪 Guia de Teste: Estado de Loading Persistente

## Como Testar a Implementação

### Teste 1: Geração Normal ✅

**Objetivo:** Verificar que o nó fica em loading até a imagem estar pronta

**Passos:**
1. Abra um projeto
2. Adicione um nó de texto com um prompt
3. Adicione um nó de imagem e conecte ao texto
4. Clique no botão "Generate" (▶️)

**Resultado Esperado:**
- ✅ Nó mostra skeleton de loading com spinner
- ✅ Texto "Generating..." aparece
- ✅ Após alguns segundos, imagem aparece
- ✅ Toast "Image generated successfully" aparece UMA VEZ
- ✅ Nenhum toast de erro aparece

**Logs no Console:**
```
🔍 Provider detection: { modelId: 'kie-nano-banana', ... }
✅ Image generation pending, returning placeholder
🔄 Ativando loading state (status persistido no nó)
```

---

### Teste 2: Reload Durante Geração ✅

**Objetivo:** Verificar que o estado de loading persiste após reload

**Passos:**
1. Siga os passos do Teste 1
2. Enquanto o nó está em loading, **recarregue a página** (F5 ou Cmd+R)
3. Aguarde a página carregar

**Resultado Esperado:**
- ✅ Nó continua mostrando loading após reload
- ✅ Texto "Generating..." ainda aparece
- ✅ Quando webhook completar, imagem aparece automaticamente
- ✅ Toast "Image generated successfully" aparece
- ✅ Nenhum toast de erro aparece

**Logs no Console (após reload):**
```
🔄 Ativando loading state (status persistido no nó)
✅ Webhook completou, URL recebida: https://...
✅ Image loaded successfully
```

---

### Teste 3: Múltiplas Janelas ✅

**Objetivo:** Verificar sincronização entre janelas via Realtime

**Passos:**
1. Abra um projeto em uma janela
2. Copie a URL e abra em outra janela/aba
3. Na janela 1, adicione nó de texto e imagem
4. Clique "Generate" na janela 1

**Resultado Esperado:**
- ✅ Janela 1: Nó entra em loading
- ✅ Janela 2: Nó também entra em loading (Realtime sync)
- ✅ Quando webhook completar:
  - Janela 1: Imagem aparece + toast de sucesso
  - Janela 2: Imagem aparece automaticamente
- ✅ Nenhum toast de erro em nenhuma janela

**Logs no Console (ambas janelas):**
```
🔄 Ativando loading state (status persistido no nó)
✅ Webhook completou, URL recebida
✅ Image loaded successfully
```

---

### Teste 4: Edição de Imagem ✅

**Objetivo:** Verificar que edição também persiste loading

**Passos:**
1. Gere uma imagem (Teste 1)
2. Adicione outro nó de imagem
3. Conecte a primeira imagem ao novo nó
4. Adicione instruções (ex: "make it blue")
5. Clique "Generate"

**Resultado Esperado:**
- ✅ Nó entra em loading
- ✅ Se recarregar, loading persiste
- ✅ Imagem editada aparece automaticamente
- ✅ Toast de sucesso aparece UMA VEZ
- ✅ Nenhum toast de erro

---

### Teste 5: Erro Real ✅

**Objetivo:** Verificar que erros reais são mostrados

**Passos:**
1. Adicione um nó de imagem SEM conectar a nenhum texto
2. Clique "Generate"

**Resultado Esperado:**
- ✅ Toast de erro aparece: "No input provided"
- ✅ Nó NÃO fica em loading infinito
- ✅ Nó volta ao estado inicial

---

### Teste 6: Múltiplas Gerações Sequenciais ✅

**Objetivo:** Verificar que múltiplas gerações funcionam corretamente

**Passos:**
1. Gere uma imagem (Teste 1)
2. Aguarde completar
3. Clique "Regenerate" (🔄)
4. Aguarde completar
5. Repita mais 2-3 vezes

**Resultado Esperado:**
- ✅ Cada geração mostra loading corretamente
- ✅ Cada geração mostra toast de sucesso UMA VEZ
- ✅ Nenhum toast duplicado
- ✅ Nenhum toast de erro falso
- ✅ Imagens são atualizadas corretamente

---

## Checklist de Verificação

### ✅ Estados do Nó

- [ ] Loading inicial (skeleton + spinner)
- [ ] Loading persiste após reload
- [ ] Imagem aparece quando pronta
- [ ] Nó volta ao normal após erro

### ✅ Toasts

- [ ] Toast de sucesso aparece UMA VEZ
- [ ] Toast de sucesso só aparece quando imagem carrega
- [ ] Nenhum toast de erro falso durante loading
- [ ] Toast de erro só aparece para erros reais

### ✅ Sincronização

- [ ] Realtime funciona entre janelas
- [ ] Estado persiste no banco de dados
- [ ] Reload não quebra o fluxo
- [ ] Múltiplas gerações funcionam

### ✅ Performance

- [ ] Nó não trava durante loading
- [ ] Imagem carrega suavemente
- [ ] Sem flickering ou flash
- [ ] Transições são suaves

---

## Problemas Conhecidos e Soluções

### ❌ Problema: Toast de erro "Failed to load image"

**Causa:** URL antiga tentando carregar durante transição

**Solução Implementada:**
```typescript
// Suprime erros durante loading e transição
if (loading || imageLoading || currentUrl !== previousUrl) {
  return; // Não mostra toast
}
```

### ❌ Problema: Toast duplicado de sucesso

**Causa:** Componente re-renderiza múltiplas vezes

**Solução Implementada:**
```typescript
// Flag para controlar quando mostrar toast
if (shouldShowSuccessToast) {
  toast.success('Image generated successfully');
  setShouldShowSuccessToast(false); // Só mostra uma vez
}
```

### ❌ Problema: Loading não persiste após reload

**Causa:** Estado não estava salvo no banco

**Solução Implementada:**
```typescript
// Salva status no banco de dados
await database.update(projects).set({
  content: {
    nodes: updatedNodes // Com loading: true, status: 'generating'
  }
});
```

---

## Logs Importantes

### ✅ Sucesso
```
🔍 Provider detection: { modelId, provider, nodeId, projectId }
✅ Image generation pending, returning placeholder
🔄 Ativando loading state (status persistido no nó)
🔔 KIE.ai webhook received
✅ Found job: { jobId, userId }
✅ Job completed successfully
📤 Uploading image to storage...
✅ Image uploaded to storage
📝 Updating project node with permanent URL...
✅ Project node updated successfully
✅ Webhook completou, URL recebida
✅ Image loaded successfully
```

### ❌ Erro (esperado)
```
❌ Error in handleGenerate: No input provided
❌ Erro real na geração: No input provided
```

### ⚠️ Supressão (esperado)
```
⚠️ Suprimindo toast duplicado para a mesma URL
⚠️ Suprimindo erro durante processo de geração
⚠️ Suprimindo erro durante transição de URL
```

---

## Comandos Úteis

### Ver logs do webhook
```bash
# Terminal 1: Tunnel para webhook local
npm run tunnel

# Terminal 2: Ver logs do servidor
npm run dev
```

### Verificar banco de dados
```sql
-- Ver projetos com nós em loading
SELECT 
  id, 
  name,
  content->'nodes' as nodes
FROM project
WHERE content::text LIKE '%"loading":true%';

-- Ver jobs pendentes
SELECT * FROM fal_jobs WHERE status = 'pending';
```

### Limpar estado de teste
```sql
-- Limpar jobs antigos
DELETE FROM fal_jobs WHERE created_at < NOW() - INTERVAL '1 day';

-- Resetar nó para estado inicial
UPDATE project 
SET content = jsonb_set(
  content,
  '{nodes,0,data}',
  '{"loading": false, "status": null}'::jsonb
)
WHERE id = 'seu-project-id';
```

---

## Conclusão

Se todos os testes passarem, a implementação está funcionando corretamente:

✅ Nó fica em loading até receber a imagem
✅ Estado persiste entre reloads
✅ Sincroniza entre múltiplas janelas
✅ Não mostra toasts de erro falsos
✅ Re-renderiza automaticamente quando pronto
