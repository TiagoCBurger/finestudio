# Análise e Melhorias do Schema do Banco de Dados

## Análise Realizada

### Estado Atual da Tabela `project`

**Problemas Identificados:**

1. **Colunas não utilizadas:**
   - `vision_model`: Presente em todos os 6 projetos com valor fixo `"openai-gpt-4.1-nano"`
   - `transcription_model`: Presente em todos os 6 projetos com valor fixo `"gpt-4o-mini-transcribe"`
   - Essas colunas não são referenciadas em nenhuma lógica de negócio no código

2. **Campo `members` não populado:**
   - Todos os 6 projetos têm `members = NULL`
   - O campo existe mas nunca foi utilizado
   - Políticas RLS já verificam `members` mas o campo está vazio

3. **Falta de constraints:**
   - Não há foreign key entre `project.user_id` e `profile.id`
   - Não há garantia que `user_id` esteja incluído em `members`
   - Campo `members` permite NULL mas deveria sempre ter pelo menos o owner

## Melhorias Implementadas

### Migration: `20250115000001_improve_project_schema.sql`

#### 1. Remoção de Colunas Não Utilizadas
```sql
ALTER TABLE project
DROP COLUMN IF EXISTS vision_model,
DROP COLUMN IF EXISTS transcription_model;
```

**Benefícios:**
- Reduz tamanho da tabela
- Simplifica o schema
- Remove dados redundantes
- Facilita manutenção

#### 2. População do Campo `members`
```sql
UPDATE project
SET members = ARRAY[user_id]
WHERE members IS NULL OR NOT (user_id = ANY(members));
```

**Benefícios:**
- Garante que todos os projetos tenham membros
- Owner sempre incluído no array de membros
- Corrige dados históricos

#### 3. Constraints de Integridade
```sql
-- NOT NULL constraint
ALTER TABLE project
ALTER COLUMN members SET NOT NULL;

-- Foreign key para profile
ALTER TABLE project
ADD CONSTRAINT fk_project_user_id 
FOREIGN KEY (user_id) 
REFERENCES profile(id) 
ON DELETE CASCADE;

-- Check constraint para garantir owner em members
ALTER TABLE project
ADD CONSTRAINT check_user_in_members 
CHECK (user_id = ANY(members));
```

**Benefícios:**
- Integridade referencial garantida
- Impossível criar projeto sem owner em members
- Cascade delete automático quando usuário é deletado

#### 4. Trigger Automático
```sql
CREATE OR REPLACE FUNCTION ensure_user_in_members()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.members IS NULL THEN
    NEW.members := ARRAY[NEW.user_id];
  ELSIF NOT (NEW.user_id = ANY(NEW.members)) THEN
    NEW.members := array_append(NEW.members, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_user_in_members
  BEFORE INSERT OR UPDATE ON project
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_in_members();
```

**Benefícios:**
- Automação: owner sempre adicionado aos members
- Previne erros de programação
- Funciona em INSERT e UPDATE

#### 5. Índice GIN para Arrays
```sql
CREATE INDEX IF NOT EXISTS idx_project_members ON project USING GIN(members);
```

**Benefícios:**
- Performance otimizada para queries com `ANY(members)`
- Essencial para políticas RLS que verificam membros
- Melhora queries de autorização

## Schema Atualizado

### Antes
```typescript
export const projects = pgTable('project', {
  id: text('id').primaryKey().default(uuid).notNull(),
  name: varchar('name').notNull(),
  transcriptionModel: varchar('transcription_model').notNull(), // ❌ Removido
  visionModel: varchar('vision_model').notNull(),               // ❌ Removido
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  content: json('content'),
  userId: varchar('user_id').notNull(),
  image: varchar('image'),
  members: text('members').array(),                             // ❌ Permitia NULL
});
```

### Depois
```typescript
export const projects = pgTable('project', {
  id: text('id').primaryKey().default(uuid).notNull(),
  name: varchar('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  content: json('content'),
  userId: varchar('user_id').notNull(),
  image: varchar('image'),
  members: text('members').array().notNull(), // ✅ NOT NULL, sempre populado
});
```

## Impacto nas Políticas RLS

As políticas RLS existentes agora funcionarão corretamente:

```sql
-- Exemplo de política que agora funciona corretamente
CREATE POLICY "users_can_access_project_broadcasts" 
ON realtime.messages
FOR SELECT TO authenticated
USING (
  topic LIKE 'project:%' AND
  EXISTS (
    SELECT 1 FROM project
    WHERE project.id = split_part(messages.topic, ':', 2)
    AND (
      project.user_id::text = auth.uid()::text 
      OR auth.uid()::text = ANY(project.members) -- ✅ Agora sempre populado
    )
  )
);
```

## Como Aplicar

### 1. Aplicar Migration
```bash
# Via Supabase CLI
supabase db push

# Ou via MCP
mcp_supabase_apply_migration
```

### 2. Regenerar Types
```bash
# Atualizar tipos TypeScript
supabase gen types typescript --local > lib/database.types.ts
```

### 3. Verificar Aplicação
```sql
-- Verificar que colunas foram removidas
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'project';

-- Verificar que members está populado
SELECT id, user_id, members 
FROM project 
WHERE members IS NULL OR NOT (user_id = ANY(members));
-- Deve retornar 0 linhas

-- Verificar constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'project';
```

## Próximos Passos Recomendados

### 1. Implementar Funcionalidade de Membros
Agora que o campo `members` está corretamente estruturado, você pode:

- Adicionar UI para convidar membros ao projeto
- Implementar permissões granulares (owner, editor, viewer)
- Criar tabela `project_members` com roles se precisar de mais controle

### 2. Considerar Tabela de Configurações
Se precisar adicionar configurações de modelo no futuro:

```sql
CREATE TABLE project_settings (
  project_id TEXT PRIMARY KEY REFERENCES project(id) ON DELETE CASCADE,
  vision_model VARCHAR DEFAULT 'openai-gpt-4.1-nano',
  transcription_model VARCHAR DEFAULT 'gpt-4o-mini-transcribe',
  -- Outras configurações específicas
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Isso permite:
- Configurações opcionais por projeto
- Valores default globais
- Fácil adição de novas configurações

### 3. Adicionar Auditoria
Considere adicionar trigger de auditoria para mudanças em `members`:

```sql
CREATE TABLE project_member_audit (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT REFERENCES project(id),
  action VARCHAR, -- 'added', 'removed'
  user_id TEXT,
  changed_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Resumo

✅ **Removido:** Colunas não utilizadas (`vision_model`, `transcription_model`)  
✅ **Corrigido:** Campo `members` agora sempre populado com owner  
✅ **Adicionado:** Constraints de integridade e foreign keys  
✅ **Automatizado:** Trigger garante owner sempre em members  
✅ **Otimizado:** Índice GIN para queries de membros  
✅ **Documentado:** Schema com comentários explicativos  

O schema agora está mais limpo, seguro e pronto para funcionalidades de colaboração.
