# Guia de Aplicação: Melhorias no Schema do Banco de Dados

## Resumo das Mudanças

Esta migração melhora a modelagem da tabela `project`:

1. ✅ Remove colunas não utilizadas (`vision_model`, `transcription_model`)
2. ✅ Popula o campo `members` com o `user_id` (owner)
3. ✅ Adiciona constraints de integridade
4. ✅ Cria trigger automático para garantir owner em members
5. ✅ Adiciona índice GIN para performance

## Pré-requisitos

Antes de aplicar a migração, verifique o estado atual:

```bash
# Via Supabase CLI
supabase db execute -f supabase/verify-schema-improvements.sql

# Ou via SQL Editor no Dashboard do Supabase
# Cole o conteúdo de supabase/verify-schema-improvements.sql
```

## Como Aplicar

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# 1. Certifique-se de estar conectado ao projeto correto
supabase link --project-ref <seu-project-ref>

# 2. Aplique a migração
supabase db push

# 3. Verifique se foi aplicada
supabase db execute -f supabase/verify-schema-improvements.sql
```

### Opção 2: Via Dashboard do Supabase

1. Acesse o Dashboard do Supabase
2. Vá em **Database** → **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo de `supabase/migrations/20250115000001_improve_project_schema.sql`
5. Execute a query
6. Verifique os resultados

### Opção 3: Via Script Manual

Se preferir aplicar passo a passo:

```sql
-- PASSO 1: Backup (recomendado)
CREATE TABLE project_backup AS SELECT * FROM project;

-- PASSO 2: Popule members
UPDATE project
SET members = ARRAY[user_id]
WHERE members IS NULL OR NOT (user_id = ANY(members));

-- PASSO 3: Verifique
SELECT id, user_id, members FROM project;
-- Todos devem ter members populado

-- PASSO 4: Remove colunas não utilizadas
ALTER TABLE project
DROP COLUMN IF EXISTS vision_model,
DROP COLUMN IF EXISTS transcription_model;

-- PASSO 5: Adicione NOT NULL
ALTER TABLE project
ALTER COLUMN members SET NOT NULL;

-- PASSO 6: Adicione índice
CREATE INDEX IF NOT EXISTS idx_project_members ON project USING GIN(members);

-- PASSO 7: Adicione foreign key
ALTER TABLE project
ADD CONSTRAINT fk_project_user_id 
FOREIGN KEY (user_id) 
REFERENCES profile(id) 
ON DELETE CASCADE;

-- PASSO 8: Adicione check constraint
ALTER TABLE project
ADD CONSTRAINT check_user_in_members 
CHECK (user_id = ANY(members));

-- PASSO 9: Crie função e trigger
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

DROP TRIGGER IF EXISTS trigger_ensure_user_in_members ON project;
CREATE TRIGGER trigger_ensure_user_in_members
  BEFORE INSERT OR UPDATE ON project
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_in_members();

-- PASSO 10: Adicione comentários
COMMENT ON TABLE project IS 'Projects table. Each project must have at least one member (the owner/user_id). Members array contains all user IDs with access to the project.';
COMMENT ON COLUMN project.members IS 'Array of user IDs with access to this project. Always includes user_id (owner).';
COMMENT ON COLUMN project.user_id IS 'Project owner ID. Must be included in members array.';
```

## Verificação Pós-Aplicação

Execute estas queries para confirmar que tudo está correto:

```sql
-- 1. Verificar que colunas foram removidas
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'project'
  AND column_name IN ('vision_model', 'transcription_model');
-- Deve retornar 0 linhas

-- 2. Verificar que members está populado
SELECT COUNT(*) 
FROM project 
WHERE members IS NULL OR NOT (user_id = ANY(members));
-- Deve retornar 0

-- 3. Verificar constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'project';
-- Deve incluir: fk_project_user_id, check_user_in_members

-- 4. Verificar trigger
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'project';
-- Deve incluir: trigger_ensure_user_in_members

-- 5. Testar inserção
INSERT INTO project (name, user_id, content)
VALUES ('Test Project', 'e04931a4-b423-449f-8cc5-d7574b79028c', '{}');

SELECT id, name, user_id, members 
FROM project 
WHERE name = 'Test Project';
-- members deve conter automaticamente o user_id

-- 6. Limpar teste
DELETE FROM project WHERE name = 'Test Project';
```

## Atualizar Código TypeScript

Após aplicar a migração, atualize os tipos:

```bash
# Regenerar tipos do Supabase
supabase gen types typescript --local > lib/database.types.ts

# Ou se estiver usando projeto remoto
supabase gen types typescript --project-ref <seu-project-ref> > lib/database.types.ts
```

O arquivo `schema.ts` já foi atualizado para refletir as mudanças.

## Rollback (Se Necessário)

Se algo der errado, você pode reverter:

```sql
-- 1. Restaurar do backup (se criou)
DROP TABLE project;
ALTER TABLE project_backup RENAME TO project;

-- 2. Ou reverter manualmente
ALTER TABLE project DROP CONSTRAINT IF EXISTS fk_project_user_id;
ALTER TABLE project DROP CONSTRAINT IF EXISTS check_user_in_members;
DROP TRIGGER IF EXISTS trigger_ensure_user_in_members ON project;
DROP FUNCTION IF EXISTS ensure_user_in_members();
ALTER TABLE project ALTER COLUMN members DROP NOT NULL;
DROP INDEX IF EXISTS idx_project_members;

-- Adicionar colunas de volta
ALTER TABLE project 
ADD COLUMN vision_model VARCHAR NOT NULL DEFAULT 'openai-gpt-4.1-nano',
ADD COLUMN transcription_model VARCHAR NOT NULL DEFAULT 'gpt-4o-mini-transcribe';
```

## Impacto no Código Existente

### Código que NÃO precisa ser alterado:
- ✅ Queries que leem `project.user_id`
- ✅ Queries que leem `project.members`
- ✅ Políticas RLS existentes
- ✅ Triggers de broadcast

### Código que pode precisar de ajuste:
- ⚠️ Queries que tentam ler `vision_model` ou `transcription_model`
- ⚠️ Inserts que especificam `vision_model` ou `transcription_model`

Busque no código por referências:

```bash
# Buscar referências a vision_model
grep -r "vision_model" --include="*.ts" --include="*.tsx" .

# Buscar referências a transcription_model
grep -r "transcription_model" --include="*.ts" --include="*.tsx" .
```

Baseado na análise, não há referências no código de aplicação, apenas em:
- Arquivos de schema/types (já atualizados)
- Migrations antigas (não afetam)

## Próximos Passos

Após aplicar a migração com sucesso:

1. **Teste a aplicação:**
   - Criar novo projeto
   - Editar projeto existente
   - Verificar que members está sempre populado

2. **Monitore logs:**
   - Verifique se não há erros relacionados a colunas removidas
   - Confirme que trigger está funcionando

3. **Considere implementar:**
   - UI para adicionar/remover membros de projetos
   - Sistema de permissões (owner, editor, viewer)
   - Auditoria de mudanças em membros

## Suporte

Se encontrar problemas:

1. Verifique os logs do Supabase
2. Execute o script de verificação
3. Consulte a documentação em `docs/DATABASE_SCHEMA_IMPROVEMENTS.md`
4. Considere fazer rollback se necessário

## Checklist de Aplicação

- [ ] Backup do banco de dados criado
- [ ] Script de verificação executado
- [ ] Migração aplicada com sucesso
- [ ] Verificação pós-aplicação executada
- [ ] Tipos TypeScript regenerados
- [ ] Código testado em desenvolvimento
- [ ] Sem erros nos logs
- [ ] Documentação revisada
- [ ] Pronto para produção
