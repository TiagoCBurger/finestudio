# 🚀 Aplicar Migration Manualmente

## Passo 1: Acessar Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)

## Passo 2: Executar SQL

Copie e cole este SQL no editor:

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

## Passo 3: Executar

1. Clique no botão **Run** (ou pressione Cmd+Enter / Ctrl+Enter)
2. Aguarde a mensagem de sucesso

## Passo 4: Verificar

Execute este SQL para verificar se as policies foram criadas:

```sql
SELECT 
    policyname,
    cmd,
    tablename
FROM pg_policies 
WHERE schemaname = 'realtime' 
AND tablename = 'messages'
AND policyname LIKE '%projects%';
```

Deve retornar 2 linhas:
- `users_can_subscribe_to_own_projects` (SELECT)
- `users_can_broadcast_to_own_projects` (INSERT)

## Passo 5: Testar

1. **Recarregue a página** do seu app (F5)
2. **Abra o console** (F12)
3. **Procure por:**
   ```
   ✅ SUBSCRIBED - Successfully connected to project channel
   ```
4. **Gere uma imagem** e observe:
   - Fila deve atualizar automaticamente ✅
   - Nó deve atualizar com a imagem ✅
   - Console deve mostrar: `📨 Broadcast received` ✅

## 🎉 Pronto!

Se ver "SUBSCRIBED" no console, o Realtime está funcionando!

## ⚠️ Se Ainda Não Funcionar

1. **Force reconexão:**
   - Feche todas as abas do projeto
   - Abra novamente

2. **Limpe o cache:**
   - Chrome: Cmd+Shift+Delete (Mac) ou Ctrl+Shift+Delete (Windows)
   - Marque "Cached images and files"
   - Clique "Clear data"

3. **Verifique a tabela:**
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename = 'projects';
   ```
   Deve retornar 1 linha com `projects`

## 📝 Alternativa: Via CLI

Se preferir usar CLI:

```bash
# 1. Fazer login no Supabase
npx supabase login

# 2. Link com o projeto
npx supabase link --project-ref SEU_PROJECT_REF

# 3. Aplicar migration
npx supabase db push
```

Mas o método manual via Dashboard é mais rápido! 🚀
