# ⚡ Solução Rápida: Realtime Não Atualiza

## 🎯 Teste Rápido

1. **Abra o console** (F12)
2. **Cole e execute** o conteúdo de `test-realtime-connection.js`
3. **Leia o resultado** - ele vai dizer exatamente o que está errado

## 🔧 Soluções Comuns

### Solução 1: Recarregar Página
```
Simplesmente recarregue a página (F5 ou Cmd+R)
```
**Quando usar:** Primeira tentativa sempre

### Solução 2: Verificar Logs do Console

Procure por estes logs após gerar imagem:

**✅ Funcionando:**
```
✅ SUBSCRIBED - Successfully connected to project channel
✅ SUBSCRIBED - Successfully connected to fal_jobs channel
🔔 [QueueMonitor] Job update received: { type: "UPDATE", newStatus: "completed" }
📨 Broadcast received
```

**❌ Não Funcionando:**
```
❌ CHANNEL_ERROR - Subscription failed
❌ TIMED_OUT - Subscription attempt timed out
// ou
// Nenhum log "Job update received" aparece
```

### Solução 3: Forçar Reconexão

Execute no console:
```javascript
// Remover todos os canais
window.supabase?.realtime?.channels?.forEach(c => {
    window.supabase.removeChannel(c);
});

// Recarregar página
window.location.reload();
```

### Solução 4: Verificar Sessão

Execute no console:
```javascript
window.supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) {
        console.error('❌ Sessão expirada! Faça login novamente');
        // Redirecionar para login se necessário
    } else {
        console.log('✅ Sessão ativa');
    }
});
```

## 🐛 Debug Avançado

### Verificar se Trigger Está Disparando

No Supabase SQL Editor:
```sql
-- Atualizar um job manualmente para testar trigger
UPDATE fal_jobs 
SET status = 'completed' 
WHERE id = 'algum-job-id';

-- Se o console mostrar "Job update received", trigger está OK
-- Se não mostrar, trigger não está disparando ou RLS está bloqueando
```

### Verificar RLS Policies

No Supabase SQL Editor:
```sql
-- Ver policies de realtime.messages
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'realtime' 
AND tablename = 'messages'
AND policyname LIKE '%fal_jobs%';

-- Deve retornar pelo menos 2 policies:
-- 1. users_can_receive_fal_jobs_broadcasts (SELECT)
-- 2. users_can_broadcast_fal_jobs (INSERT)
```

### Verificar Triggers

No Supabase SQL Editor:
```sql
-- Ver triggers de fal_jobs
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    p.proname AS function_name,
    t.tgenabled AS enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('fal_jobs', 'projects')
ORDER BY c.relname, t.tgname;

-- Deve mostrar:
-- fal_jobs_broadcast_trigger (fal_jobs)
-- project_broadcast_trigger (projects)
```

## 📊 Checklist de Verificação

Execute em ordem:

- [ ] Recarreguei a página
- [ ] Executei `test-realtime-connection.js` no console
- [ ] Verifiquei que canais estão em estado "joined"
- [ ] Verifiquei que sessão está ativa
- [ ] Gerei uma imagem e observei console
- [ ] Vi logs "SUBSCRIBED" no console
- [ ] Vi logs "Job update received" quando webhook completou
- [ ] Verifiquei que triggers existem no banco
- [ ] Verifiquei que RLS policies existem

## 🚨 Se Nada Funcionar

1. **Reinicie o servidor Next.js**
   ```bash
   # Parar servidor (Ctrl+C)
   # Iniciar novamente
   npm run dev
   ```

2. **Limpe o cache do navegador**
   - Chrome: Cmd+Shift+Delete (Mac) ou Ctrl+Shift+Delete (Windows)
   - Marque "Cached images and files"
   - Clique "Clear data"

3. **Verifique variáveis de ambiente**
   ```bash
   # Certifique-se de que estas estão definidas:
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

4. **Verifique Supabase Dashboard**
   - Vá em "Database" → "Replication"
   - Certifique-se de que Realtime está habilitado
   - Verifique se há erros nos logs

## 💡 Dica Final

Se você ver nos logs do servidor:
```
✅ Project node updated successfully, realtime should trigger now
```

Mas o client não atualiza, o problema é:
1. **Realtime não está conectado** (execute test-realtime-connection.js)
2. **RLS está bloqueando** (verifique policies)
3. **Trigger não está disparando** (verifique triggers)

Execute o teste e compartilhe o resultado!
