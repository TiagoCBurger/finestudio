# Problema: Erro de Conexão do Realtime

## Erro Identificado

```
🔴 [REALTIME] ❌ Subscription error
type: 'CHANNEL_ERROR'
message: 'Subscription failed: CHANNEL_ERROR'
```

## Causa

O Supabase Realtime está falhando ao conectar. Possíveis causas:

1. **Problema de Autenticação**: Token expirado ou inválido
2. **Problema de Rede**: WebSocket não consegue conectar
3. **Problema de Configuração**: URL ou chaves incorretas
4. **Problema de RLS**: Políticas bloqueando acesso

## Solução Imediata

### 1. Verificar se o Supabase está rodando

Execute no terminal:
```bash
npx supabase status
```

Se não estiver rodando:
```bash
npx supabase start
```

### 2. Verificar variáveis de ambiente

No arquivo `.env`, verifique se estão corretas:
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. Fazer logout e login novamente

1. Abra o navegador
2. Faça logout da aplicação
3. Faça login novamente
4. Isso vai renovar o token de autenticação

### 4. Limpar cache do navegador

1. Abra DevTools (F12)
2. Vá em Application > Storage
3. Clique em "Clear site data"
4. Recarregue a página

## Por Que o Contador Não Atualiza

Com o erro de Realtime, o fluxo fica assim:

1. ✅ Job é criado no banco
2. ✅ Trigger envia broadcast
3. ❌ **Cliente não recebe** (conexão falhou)
4. ❌ `addJobOptimistically` não é chamado
5. ❌ Contador não atualiza

## Teste Rápido

Execute este comando no console do navegador:

```javascript
// Verificar se há sessão ativa
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session ? 'Active' : 'None');
console.log('User:', session?.user?.email);
```

Se retornar `Session: None`, você precisa fazer login novamente.

## Próximos Passos

1. ✅ Verificar se Supabase está rodando
2. ✅ Fazer logout e login
3. ✅ Limpar console e tentar novamente
4. ✅ Procurar por logs `➕➕➕ [QueueMonitor] addJobOptimistically CALLED`

Se após esses passos o erro persistir, o problema pode ser nas políticas RLS.

## Verificar Políticas RLS

Execute no Supabase:

```sql
-- Verificar se as políticas existem
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'messages' AND schemaname = 'realtime';
```

Deve retornar as políticas:
- `users_can_receive_fal_jobs_broadcasts` (SELECT)
- `users_can_broadcast_fal_jobs` (INSERT)

## Solução Alternativa Temporária

Se o Realtime continuar falhando, você pode usar **polling** como fallback:

1. A cada 5 segundos, buscar jobs novos da API
2. Comparar com jobs existentes
3. Adicionar novos jobs à fila

Mas isso é menos eficiente que Realtime.

## Conclusão

O problema NÃO é no código da fila, mas na **conexão do Realtime**. Depois de resolver o erro de conexão, o contador vai atualizar automaticamente.

**PRIMEIRO: Resolva o erro de conexão do Realtime!**
