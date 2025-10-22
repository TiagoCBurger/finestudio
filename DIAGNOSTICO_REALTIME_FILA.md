# 🔍 Diagnóstico: Problemas com Realtime na Fila e Reload

## Problemas Identificados

### 1. ❌ Fila não atualiza automaticamente
**Sintoma:** Usuário precisa recarregar a página para ver mudanças na fila
**Causa Provável:** Realtime não está recebendo broadcasts ou não está inscrito corretamente

### 2. ❌ Erro ao recarregar página durante geração
**Sintoma:** Toast de erro aparece ao recarregar página enquanto imagem está sendo gerada
**Causa Provável:** Componente tenta carregar imagem com URL vazia antes do webhook completar

### 3. ✅ Nó fica em loading após reload (CORRETO)
**Sintoma:** Nó permanece em estado de loading após reload
**Status:** Isso está correto! O estado deve persistir.

## Diagnóstico Detalhado

### Verificar Logs do Console

Abra o console do navegador (F12) e procure por:

#### ✅ Logs Esperados (Funcionando)
```javascript
// Queue Monitor
"Scheduling subscription attempt with debounce"
"Channel created, getting session"
"Session found, setting auth for realtime"
"Auth set for realtime, subscribing to channel"
"SUBSCRIBED - Successfully connected to fal_jobs channel"

// Quando job atualiza
"Job update received" { type: "UPDATE", jobId: "..." }
```

#### ❌ Logs de Problema (Não Funcionando)
```javascript
// Subscription falhou
"CHANNEL_ERROR - Subscription failed"
"TIMED_OUT - Subscription attempt timed out"
"Max retries exceeded, giving up"

// Não recebe atualizações
// (Nenhum log "Job update received" quando webhook completa)
```

### Verificar Logs do Servidor

No terminal do Next.js, procure por:

#### ✅ Logs Esperados (Funcionando)
```bash
# Webhook completa
✅ Job completed successfully, processing result...
✅ Image uploaded to storage: https://...
✅ Project node updated successfully, realtime should trigger now

# Trigger do banco de dados deve disparar
# (Isso dispara broadcast para fal_jobs)
```

## Possíveis Causas

### Causa 1: Trigger do Banco de Dados Não Configurado

O trigger para `fal_jobs` pode não estar configurado corretamente.

**Verificar:**
```sql
-- Verificar se trigger existe
SELECT * FROM pg_trigger WHERE tgname LIKE '%fal_jobs%';

-- Verificar função do trigger
SELECT proname, prosrc FROM pg_proc WHERE proname LIKE '%fal_jobs%';
```

### Causa 2: RLS Policy Bloqueando Broadcasts

A policy de RLS pode estar bloqueando os broadcasts.

**Verificar:**
```sql
-- Verificar policies em realtime.messages
SELECT * FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'realtime';

-- Verificar policies em fal_jobs
SELECT * FROM pg_policies WHERE tablename = 'fal_jobs';
```

### Causa 3: Realtime Não Está Inscrito

O componente pode não estar se inscrevendo corretamente.

**Verificar no console:**
- Procurar por "SUBSCRIBED - Successfully connected to fal_jobs channel"
- Se não aparecer, há problema na inscrição

### Causa 4: Erro ao Carregar Imagem Durante Reload

Quando recarrega, o componente tenta carregar imagem antes do webhook completar.

**Verificar no console:**
- Procurar por "Failed to load image"
- Verificar se URL está vazia ou inválida

## Soluções

### Solução 1: Verificar e Criar Trigger para fal_jobs

Precisamos garantir que mudanças em `fal_jobs` disparam broadcasts.

**Arquivo:** `supabase/migrations/YYYYMMDD_add_fal_jobs_broadcast_trigger.sql`

```sql
-- Criar função de broadcast para fal_jobs
CREATE OR REPLACE FUNCTION broadcast_fal_job_changes()
RETURNS TRIGGER AS $$
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Broadcast para canal específico do usuário
  PERFORM realtime.broadcast_changes(
    'fal_jobs:' || COALESCE(NEW.user_id, OLD.user_id)::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS fal_jobs_broadcast_trigger ON fal_jobs;
CREATE TRIGGER fal_jobs_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON fal_jobs
  FOR EACH ROW EXECUTE FUNCTION broadcast_fal_job_changes();
```

### Solução 2: Melhorar Detecção de Estado no Componente

O componente precisa detectar melhor quando está aguardando webhook.

**Arquivo:** `components/nodes/image/transform.tsx`

Adicionar verificação mais robusta:

```typescript
// Verificar se está aguardando webhook ANTES de tentar carregar imagem
const isAwaitingWebhook = (data as any).loading === true || 
                          (data as any).status === 'generating' ||
                          (data as any).requestId;

// Só renderizar imagem se não estiver aguardando webhook E tiver URL válida
const shouldRenderImage = !isAwaitingWebhook && hasValidUrl;
```

### Solução 3: Adicionar Logs de Debug

Adicionar logs para diagnosticar o problema.

**Arquivo:** `hooks/use-queue-monitor.ts`

```typescript
// No handleJobUpdate
const handleJobUpdate = useCallback((payload: JobUpdatePayload) => {
  console.log('🔔 [QueueMonitor] Job update received:', {
    type: payload.type,
    jobId: payload.new?.id || payload.old?.id,
    status: payload.new?.status,
    timestamp: new Date().toISOString()
  });
  
  // ... resto do código
}, [userId]);
```

### Solução 4: Forçar Refresh Após Webhook

Garantir que a fila é atualizada após webhook completar.

**Arquivo:** `hooks/use-queue-monitor.ts`

```typescript
// Adicionar refresh automático quando job completa
useEffect(() => {
  const completedJobs = jobs.filter(j => j.status === 'completed' && !j.completedAt);
  if (completedJobs.length > 0) {
    console.log('🔄 [QueueMonitor] Detected completed jobs, refreshing...');
    fetchJobs();
  }
}, [jobs, fetchJobs]);
```

## Plano de Ação

### Passo 1: Verificar Logs
1. Abrir console do navegador (F12)
2. Recarregar página
3. Procurar por logs de subscription
4. Verificar se "SUBSCRIBED" aparece

### Passo 2: Testar Realtime
1. Gerar uma imagem
2. Observar console
3. Verificar se "Job update received" aparece quando webhook completa
4. Se não aparecer, Realtime não está funcionando

### Passo 3: Verificar Banco de Dados
1. Conectar ao Supabase
2. Verificar se trigger existe
3. Verificar se RLS policies estão corretas

### Passo 4: Aplicar Correções
1. Criar trigger se não existir
2. Adicionar logs de debug
3. Melhorar detecção de estado
4. Testar novamente

## Comandos Úteis

### Verificar Trigger no Supabase

```sql
-- Listar triggers
SELECT 
  t.tgname AS trigger_name,
  c.relname AS table_name,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'fal_jobs';
```

### Testar Broadcast Manualmente

```sql
-- Testar se broadcast funciona
SELECT realtime.broadcast_changes(
  'fal_jobs:test-user-id',
  'UPDATE',
  'UPDATE',
  'fal_jobs',
  'public',
  '{"id": "test", "status": "completed"}'::jsonb,
  '{"id": "test", "status": "pending"}'::jsonb
);
```

### Verificar RLS Policies

```sql
-- Listar policies para realtime.messages
SELECT * FROM pg_policies 
WHERE schemaname = 'realtime' 
AND tablename = 'messages';
```

## Próximos Passos

1. ✅ Executar diagnóstico completo
2. ✅ Identificar causa raiz
3. ✅ Aplicar correção apropriada
4. ✅ Testar solução
5. ✅ Documentar resultado
