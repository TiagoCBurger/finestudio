# Troubleshooting - Sistema de Webhook Fal.ai

## ✅ Checklist de Verificação

### 1. Variáveis de Ambiente
```bash
# .env deve ter:
NEXT_PUBLIC_APP_URL=https://seu-tunel.serveo.net  # ✅ Configurado?
SUPABASE_SERVICE_ROLE_KEY=eyJ...                  # ✅ Existe?
FAL_API_KEY=xxx                                    # ✅ Válido?
```

**Verificar:**
- [ ] `NEXT_PUBLIC_APP_URL` está configurado com URL do túnel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` existe no .env
- [ ] Servidor foi **reiniciado** após mudanças no .env

### 2. Túnel (Serveo/Ngrok)
```bash
# Rodar em terminal separado:
ssh -R 80:localhost:3000 serveo.net
```

**Verificar:**
- [ ] Túnel está rodando
- [ ] URL do túnel está no `NEXT_PUBLIC_APP_URL`
- [ ] Túnel não desconectou

### 3. Banco de Dados
```bash
# Verificar se tabela existe:
pnpm migrate
```

**Verificar:**
- [ ] Tabela `fal_jobs` existe
- [ ] Migrations foram aplicadas

### 4. Logs do Servidor

**Ao gerar imagem, deve aparecer:**
```
✅ Fal.ai submission mode: { mode: 'WEBHOOK (production/tunnel)', ... }
✅ Pre-creating job to avoid race condition...
✅ Job pre-created with ID: xxx
✅ Fal.ai queue submitted: { request_id: 'xxx', useWebhook: true }
✅ Job updated with real request_id, waiting for webhook...
✅ Returning pending result, frontend will poll for completion...
```

**Quando webhook chegar:**
```
✅ Fal.ai webhook received: { request_id: 'xxx', status: 'OK', ... }
✅ Extracted result from webhook: { hasImages: true, ... }
✅ Creating Supabase client with service role key...
✅ Has SERVICE_ROLE_KEY: true
✅ Supabase client created successfully
✅ Uploading image to Supabase Storage...
✅ Image uploaded to Supabase: https://...
✅ Updating project node with permanent URL...
✅ Project node updated successfully
✅ Job completed: xxx
```

### 5. Logs do Frontend (Console do Navegador)

**Deve aparecer:**
```
✅ Server Action response: { nodeData: { ... } }
✅ Fal.ai headers: { falRequestId: 'xxx', falStatus: 'pending', ... }
✅ Fal.ai job submitted, monitoring: xxx
✅ Polling job status: { requestId: 'xxx', status: 'pending', ... }
✅ Polling job status: { requestId: 'xxx', status: 'completed', ... }
✅ Job status changed: { status: 'completed', hasResult: true, ... }
✅ Fal.ai job completed, updating node: { images: [...] }
✅ Extracted image URL: https://scqpyqlghrjvftvoyhau.supabase.co/...
✅ Updating node data with image URL
```

## ❌ Problemas Comuns

### Problema 1: Erro 403 no Upload
```
Upload error: { statusCode: '403', error: 'Unauthorized', ... }
```

**Causa:** Service role key não está sendo usada

**Solução:**
1. Verificar se `SUPABASE_SERVICE_ROLE_KEY` está no .env
2. Reiniciar servidor Next.js
3. Verificar logs: `Has SERVICE_ROLE_KEY: true`

### Problema 2: Imagem não aparece (ícone ?)
```
Error: hostname "v3b.fal.media" is not configured
```

**Causa:** URL temporária do fal.ai sendo usada (upload falhou)

**Solução:**
1. Verificar se upload para Supabase funcionou
2. Verificar logs: `Image uploaded to Supabase: https://...`
3. Se upload falhou, ver Problema 1

### Problema 3: Webhook não chega
```
# Servidor não mostra: "Fal.ai webhook received"
```

**Causa:** Túnel não está acessível ou URL incorreta

**Solução:**
1. Verificar se túnel está rodando
2. Testar URL do túnel no navegador
3. Verificar se `NEXT_PUBLIC_APP_URL` está correto
4. Reconectar túnel se necessário

### Problema 4: Frontend não atualiza
```
# Console mostra: "Polling job status: { status: 'pending', ... }"
# Mas nunca muda para 'completed'
```

**Causa:** Webhook não atualizou o job no banco

**Solução:**
1. Verificar logs do webhook (Problema 3)
2. Verificar se job foi atualizado no banco
3. Verificar se `nodeId` e `projectId` estão sendo passados

### Problema 5: Imagem desaparece após reload
```
# Imagem aparece, mas some ao recarregar página
```

**Causa:** Project não foi atualizado no banco

**Solução:**
1. Verificar logs: `Project node updated successfully`
2. Verificar se `nodeId` e `projectId` estão corretos
3. Verificar se metadados estão sendo passados

## 🔍 Debug Rápido

### Teste 1: Verificar Modo
```bash
# Logs devem mostrar:
Fal.ai submission mode: { mode: 'WEBHOOK (production/tunnel)', ... }

# Se mostrar 'FALLBACK', verificar NEXT_PUBLIC_APP_URL
```

### Teste 2: Verificar Service Role Key
```bash
# No webhook, deve mostrar:
Has SERVICE_ROLE_KEY: true

# Se false, adicionar no .env e reiniciar
```

### Teste 3: Verificar Upload
```bash
# Logs devem mostrar:
Image uploaded to Supabase: https://scqpyqlghrjvftvoyhau.supabase.co/...

# Se não aparecer, verificar erro de upload
```

### Teste 4: Verificar Polling
```bash
# Console do navegador deve mostrar:
Polling job status: ...

# A cada 2 segundos até completar
```

## 🚀 Comandos Úteis

```bash
# Reiniciar servidor
pnpm dev

# Rodar migrations
pnpm migrate

# Rodar túnel
ssh -R 80:localhost:3000 serveo.net

# Ver logs em tempo real
# (já aparecem no terminal do pnpm dev)
```

## 📝 Notas

- **Modo Webhook**: Rápido, não bloqueia, requer túnel
- **Modo Fallback**: Lento, bloqueia, não requer túnel
- **Service Role Key**: Necessário para upload no webhook
- **Polling**: Frontend verifica status a cada 2 segundos
- **Túnel**: Necessário para webhook funcionar em dev

## ✅ Teste Final

1. Gerar imagem
2. Ver logs do servidor (webhook chegou?)
3. Ver logs do console (polling funcionou?)
4. Imagem apareceu?
5. Recarregar página
6. Imagem continua lá?

Se todos os passos funcionarem: **✅ Sistema OK!**
