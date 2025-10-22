# 🔍 Diagnóstico: Realtime Não Atualiza Client-Side

## Problema

- ✅ Webhook completa com sucesso (logs do servidor mostram)
- ✅ Banco de dados é atualizado
- ❌ Componente de fila NÃO atualiza
- ❌ Nó de imagem NÃO atualiza com a imagem

## Checklist de Diagnóstico

Execute no console do navegador (F12):

### 1. Verificar se Realtime está conectado

```javascript
// Verificar canais ativos
console.log('Canais Realtime:', window.supabase?.realtime?.channels);

// Verificar canal de projeto
const projectChannel = window.supabase?.realtime?.channels?.find(c => c.topic.includes('project:'));
console.log('Canal de projeto:', projectChannel?.topic, 'Estado:', projectChannel?.state);

// Verificar canal de fila
const queueChannel = window.supabase?.realtime?.channels?.find(c => c.topic.includes('fal_jobs:'));
console.log('Canal de fila:', queueChannel?.topic, 'Estado:', queueChannel?.state);
```

**Resultado esperado:**
- Ambos os canais devem ter `state: "joined"`
- Se não tiver, Realtime não está conectado

### 2. Verificar logs de subscription

Procure no console por:

```
✅ SUBSCRIBED - Successfully connected to project channel
✅ SUBSCRIBED - Successfully connected to fal_jobs channel
```

**Se NÃO aparecer:**
- Realtime não conseguiu se inscrever
- Verificar RLS policies

### 3. Verificar se recebe broadcasts

Após gerar imagem, procure por:

```
🔔 [QueueMonitor] Job update received
📨 Broadcast received (do use-project-realtime)
```

**Se NÃO aparecer:**
- Trigger não está disparando
- Ou RLS está bloqueando

## Possíveis Causas

### Causa 1: RLS Policy Bloqueando

As policies podem estar muito restritivas.

**Verificar no Supabase:**
```sql
-- Ver policies de realtime.messages
SELECT * FROM pg_policies 
WHERE schemaname = 'realtime' 
AND tablename = 'messages';
```

### Causa 2: Trigger Não Está Disparando

O trigger pode não estar configurado corretamente.

**Verificar no Supabase:**
```sql
-- Ver triggers de fal_jobs
SELECT t.tgname, c.relname, p.proname
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'fal_jobs';

-- Ver triggers de projects
SELECT t.tgname, c.relname, p.proname
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'projects';
```

### Causa 3: Sessão Expirada

A sessão do usuário pode ter expirado.

**Verificar no console:**
```javascript
const { data: { session } } = await window.supabase.auth.getSession();
console.log('Sessão:', session ? 'Ativa' : 'Expirada');
```

## Solução Rápida

Execute no console para forçar reconexão:

```javascript
// Forçar reconexão do Realtime
window.location.reload();
```

## Próximos Passos

1. Execute o checklist acima
2. Anote quais verificações falharam
3. Compartilhe os resultados
