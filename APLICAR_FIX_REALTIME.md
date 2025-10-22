# 🔧 Aplicar Fix: Realtime CHANNEL_ERROR

## Problema Identificado

O erro `CHANNEL_ERROR` acontece porque as RLS policies estão referenciando a tabela errada:
- **Errado:** `project` (singular)
- **Correto:** `projects` (plural)

## ✅ Solução

Aplique a migration que corrige as policies.

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# Aplicar migration
npx supabase db push

# Ou se estiver usando supabase link
npx supabase migration up
```

### Opção 2: Via Supabase Dashboard

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de:
   `supabase/migrations/20241222000001_fix_realtime_messages_rls_table_name.sql`
4. Clique em **Run**

### Opção 3: Executar SQL Diretamente

Copie e execute este SQL no Supabase:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "users_can_subscribe_to_own_projects" ON realtime.messages;
DROP POLICY IF EXISTS "users_can_broadcast_to_own_projects" ON realtime.messages;

-- Policy for SELECT (subscribing to channels)
CREATE POLICY "users_can_subscribe_to_own_projects" 
ON realtime.messages 
FOR SELECT 
TO authenticated
USING (
  topic ~ '^project:[a-f0-9-]+$'
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE id::text = SPLIT_PART(topic, ':', 2)
    AND user_id = auth.uid()::text
  )
);

-- Policy for INSERT (broadcasting to channels)
CREATE POLICY "users_can_broadcast_to_own_projects" 
ON realtime.messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  topic ~ '^project:[a-f0-9-]+$'
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE id::text = SPLIT_PART(topic, ':', 2)
    AND user_id = auth.uid()::text
  )
);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_realtime_messages_topic 
ON realtime.messages(topic);

CREATE INDEX IF NOT EXISTS idx_projects_user_id 
ON projects(user_id);
```

## 🧪 Testar

Após aplicar a migration:

1. **Recarregue a página** (F5)
2. **Abra o console** (F12)
3. **Procure por:**
   ```
   ✅ SUBSCRIBED - Successfully connected to project channel
   ```

4. **Gere uma imagem** e observe:
   - Fila deve atualizar automaticamente
   - Nó deve atualizar com a imagem quando pronta
   - Console deve mostrar: `📨 Broadcast received`

## 📊 Verificar se Funcionou

Execute no console:

```javascript
// Verificar estado do canal
const projectChannel = window.supabase?.realtime?.channels?.find(c => c.topic.includes('project:'));
console.log('Estado do canal:', projectChannel?.state);
// Deve mostrar: "joined"
```

## 🔍 Se Ainda Não Funcionar

1. **Verifique se a migration foi aplicada:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE schemaname = 'realtime' 
   AND tablename = 'messages'
   AND policyname LIKE '%projects%';
   ```

2. **Verifique se a tabela existe:**
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename LIKE 'project%';
   ```

3. **Force reconexão:**
   - Feche todas as abas do projeto
   - Abra novamente
   - Ou execute no console: `window.location.reload()`

## 💡 Explicação

As policies RLS controlam quem pode ler/escrever em `realtime.messages`. Se a policy referencia uma tabela que não existe (`project` em vez de `projects`), a verificação sempre falha e o Realtime não consegue conectar.

Após corrigir o nome da tabela, o Realtime vai conseguir verificar se o usuário tem permissão e conectar corretamente!
