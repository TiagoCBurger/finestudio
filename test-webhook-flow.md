# Teste Completo do Fluxo Webhook

## 🔍 Passo a Passo para Debug

### 1. Verificar Logs do Servidor ao Gerar Imagem

**Deve aparecer (em ordem):**

```
✅ Fal.ai submission mode: { mode: 'WEBHOOK (production/tunnel)', webhookUrl: 'https://...' }
✅ Pre-creating job to avoid race condition...
✅ Job pre-created with ID: xxx
✅ Fal.ai queue submitted: { request_id: 'xxx', useWebhook: true }
✅ Job updated with real request_id, waiting for webhook...
✅ Returning pending result, frontend will poll for completion...
```

**Se não aparecer:** Problema na submissão

---

### 2. Verificar Logs do Webhook

**Deve aparecer (quando fal.ai responder):**

```
✅ Fal.ai webhook received: { request_id: 'xxx', status: 'OK', ... }
✅ Extracted result from webhook: { hasImages: true, imageCount: 1, firstImageUrl: 'https://v3b.fal.media/...' }
✅ Creating Supabase client with service role key...
✅ SUPABASE_URL: https://scqpyqlghrjvftvoyhau.supabase.co
✅ Has SERVICE_ROLE_KEY: true
✅ Supabase client created successfully
✅ Uploading image to Supabase Storage...
✅ Fetching image from fal.ai: https://v3b.fal.media/...
✅ Image downloaded, size: XXXXX bytes  ← IMPORTANTE: deve ter tamanho > 0
✅ Uploading to Supabase: user-id/abc123.png
✅ Image uploaded to Supabase: https://scqpyqlghrjvftvoyhau.supabase.co/...
✅ Updating project node with permanent URL...
✅ Project node updated successfully
✅ Job completed: xxx
```

**Se faltar algum log:** Identifica onde está o problema

---

### 3. Verificar Logs do Frontend (Console do Navegador)

**Deve aparecer:**

```
✅ Server Action response: { nodeData: { generated: { headers: { 'x-fal-request-id': 'xxx', 'x-fal-status': 'pending' } } } }
✅ Fal.ai headers: { falRequestId: 'xxx', falStatus: 'pending', ... }
✅ Fal.ai job submitted, monitoring: xxx
✅ Polling job status: { requestId: 'xxx', status: 'pending', hasResult: false, ... }
✅ Polling job status: { requestId: 'xxx', status: 'completed', hasResult: true, ... }
✅ Job status changed: { status: 'completed', hasResult: true, requestId: 'xxx' }
✅ Fal.ai job completed, updating node: { images: [{ url: 'https://scqpyqlghrjvftvoyhau.supabase.co/...' }] }
✅ Extracted image URL: https://scqpyqlghrjvftvoyhau.supabase.co/...
✅ New node data: { generated: { url: 'https://...', type: 'image/png' }, ... }
```

**Se não aparecer:** Problema no polling ou atualização do nó

---

## 🐛 Problemas Comuns e Soluções

### Problema A: "Image downloaded, size: 0 bytes"

**Causa:** URL do fal.ai expirou ou é inválida

**Solução:**
- Verificar se URL está correta nos logs
- Testar URL manualmente no navegador
- Verificar se fal.ai está retornando imagem válida

### Problema B: Upload error 403

**Causa:** Service role key não está funcionando

**Solução:**
- Verificar: `Has SERVICE_ROLE_KEY: true`
- Se false: adicionar no .env e reiniciar
- Verificar se key está correta

### Problema C: "Project node updated successfully" mas imagem não aparece

**Causa:** Frontend não está detectando mudança

**Solução:**
- Verificar logs de polling no console
- Verificar se `useFalJob` está funcionando
- Verificar se `useEffect` está atualizando o nó

### Problema D: Imagem aparece mas desaparece ao reload

**Causa:** Project não foi salvo no banco

**Solução:**
- Verificar: `Project node updated successfully`
- Verificar se `nodeId` e `projectId` estão corretos
- Verificar banco de dados diretamente

---

## 🔧 Comandos de Debug

### Verificar Job no Banco

```sql
SELECT * FROM fal_jobs 
WHERE request_id = 'SEU_REQUEST_ID' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Verificar Arquivo no Storage

```sql
SELECT * FROM storage.objects 
WHERE bucket_id = 'files' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Testar URL do Webhook

```bash
curl https://seu-tunel.serveo.net/api/webhooks/fal
# Deve retornar 404 (esperado, precisa ser POST)
```

---

## 📋 Checklist Final

Antes de testar, verificar:

- [ ] Servidor Next.js reiniciado após mudanças
- [ ] Túnel (serveo) está rodando
- [ ] `NEXT_PUBLIC_APP_URL` está correto no .env
- [ ] `SUPABASE_SERVICE_ROLE_KEY` existe no .env
- [ ] Migrations foram aplicadas (`pnpm migrate`)
- [ ] Console do navegador está aberto (F12)
- [ ] Terminal do servidor está visível

---

## 🎯 Teste Agora

1. Gerar imagem
2. **Copiar TODOS os logs do servidor**
3. **Copiar TODOS os logs do console**
4. Me enviar para análise

Com os logs completos, vou identificar exatamente onde está o problema!
