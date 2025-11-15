# Checklist: Aplicação da Migration de Melhoria do Schema

## Pré-Requisitos
- [ ] Backup do banco de dados criado
- [ ] Código atualizado (pull latest changes)
- [ ] Supabase CLI instalado e configurado

## Arquivos Modificados

### Código da Aplicação
- [x] `app/actions/image/describe.ts` - Usa modelo padrão fixo
- [x] `supabase/seed/demo_data.sql` - Remove colunas obsoletas
- [x] `schema.ts` - Schema TypeScript atualizado

### Migrations
- [x] `supabase/migrations/20250115000001_improve_project_schema.sql` - Criada

### Documentação
- [x] `docs/DATABASE_SCHEMA_IMPROVEMENTS.md` - Análise completa
- [x] `docs/APPLY_DATABASE_IMPROVEMENTS.md` - Guia de aplicação
- [x] `docs/REMOVE_MODEL_COLUMNS_SUMMARY.md` - Resumo das mudanças no código
- [x] `supabase/verify-schema-improvements.sql` - Script de verificação

## Passos de Aplicação

### 1. Verificar Estado Atual
```bash
# Executar script de verificação
supabase db execute -f supabase/verify-schema-improvements.sql
```

**Resultado Esperado:**
- 6 projetos existentes
- Todos com `members = NULL`
- Todos com `vision_model = 'openai-gpt-4.1-nano'`
- Todos com `transcription_model = 'gpt-4o-mini-transcribe'`

- [ ] Verificação executada
- [ ] Resultados conferidos

### 2. Aplicar Migration
```bash
# Aplicar todas as migrations pendentes
supabase db push
```

**O que a migration faz:**
1. Popula `members` com `user_id` em todos os projetos
2. Remove colunas `vision_model` e `transcription_model`
3. Adiciona constraint NOT NULL em `members`
4. Cria índice GIN para `members`
5. Adiciona foreign key `user_id` → `profile.id`
6. Adiciona check constraint (user_id sempre em members)
7. Cria trigger automático para novos projetos

- [ ] Migration aplicada com sucesso
- [ ] Sem erros no output

### 3. Verificar Aplicação

#### 3.1 Verificar Estrutura
```sql
-- Verificar que colunas foram removidas
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'project'
  AND column_name IN ('vision_model', 'transcription_model');
```
**Esperado:** 0 linhas

- [ ] Colunas removidas confirmadas

#### 3.2 Verificar Members
```sql
-- Verificar que members está populado
SELECT id, user_id, members 
FROM project;
```
**Esperado:** Todos os projetos com `members` contendo pelo menos o `user_id`

- [ ] Members populados confirmados

#### 3.3 Verificar Constraints
```sql
-- Verificar constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'project';
```
**Esperado:** Incluir `fk_project_user_id` e `check_user_in_members`

- [ ] Constraints criadas confirmadas

#### 3.4 Verificar Trigger
```sql
-- Verificar trigger
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'project';
```
**Esperado:** Incluir `trigger_ensure_user_in_members`

- [ ] Trigger criado confirmado

### 4. Testar Funcionalidade

#### 4.1 Teste de Inserção
```sql
-- Testar inserção (trigger deve adicionar user_id em members automaticamente)
INSERT INTO project (name, user_id, content)
VALUES ('Test Project', 'e04931a4-b423-449f-8cc5-d7574b79028c', '{}');

-- Verificar
SELECT id, name, user_id, members 
FROM project 
WHERE name = 'Test Project';

-- Limpar
DELETE FROM project WHERE name = 'Test Project';
```

- [ ] Inserção funciona
- [ ] Members populado automaticamente
- [ ] Teste limpo

#### 4.2 Teste na Aplicação
- [ ] Criar novo projeto via UI
- [ ] Verificar que projeto é criado com members
- [ ] Testar descrição de imagem (deve usar modelo padrão)
- [ ] Verificar que não há erros no console

### 5. Atualizar Types (Opcional)
```bash
# Regenerar tipos TypeScript
supabase gen types typescript --local > lib/database.types.ts
```

- [ ] Types regenerados (se necessário)

### 6. Deploy

#### 6.1 Commit Changes
```bash
git add .
git commit -m "feat: improve project schema - remove unused model columns"
git push
```

- [ ] Código commitado
- [ ] Push realizado

#### 6.2 Deploy para Produção
Se estiver usando CI/CD, a migration será aplicada automaticamente.
Se não, aplique manualmente:

```bash
# Conectar ao projeto de produção
supabase link --project-ref <production-ref>

# Aplicar migrations
supabase db push
```

- [ ] Migration aplicada em produção
- [ ] Verificações executadas em produção

## Rollback (Se Necessário)

Se algo der errado:

```sql
-- 1. Remover constraints
ALTER TABLE project DROP CONSTRAINT IF EXISTS fk_project_user_id;
ALTER TABLE project DROP CONSTRAINT IF EXISTS check_user_in_members;

-- 2. Remover trigger
DROP TRIGGER IF EXISTS trigger_ensure_user_in_members ON project;
DROP FUNCTION IF EXISTS ensure_user_in_members();

-- 3. Remover NOT NULL
ALTER TABLE project ALTER COLUMN members DROP NOT NULL;

-- 4. Remover índice
DROP INDEX IF EXISTS idx_project_members;

-- 5. Adicionar colunas de volta
ALTER TABLE project 
ADD COLUMN vision_model VARCHAR NOT NULL DEFAULT 'openai-gpt-4.1-nano',
ADD COLUMN transcription_model VARCHAR NOT NULL DEFAULT 'gpt-4o-mini-transcribe';
```

- [ ] Rollback executado (se necessário)
- [ ] Sistema restaurado

## Monitoramento Pós-Deploy

### Primeiras 24h
- [ ] Monitorar logs de erro
- [ ] Verificar performance de queries
- [ ] Confirmar que novos projetos são criados corretamente
- [ ] Verificar que descrição de imagens funciona

### Primeira Semana
- [ ] Verificar uso de créditos (modelo padrão)
- [ ] Confirmar que não há regressões
- [ ] Coletar feedback de usuários

## Notas

### Mudanças de Comportamento
- **Image Description:** Agora sempre usa `openai-gpt-4.1-nano` (antes era configurável por projeto)
- **Members:** Agora sempre populado automaticamente com o owner

### Benefícios
- ✅ Schema mais limpo e simples
- ✅ Menos dados redundantes
- ✅ Integridade referencial garantida
- ✅ Performance melhorada (índice GIN)
- ✅ Automação (trigger)

### Riscos Mitigados
- ✅ Nenhuma referência no código aos campos removidos
- ✅ Migration testada localmente
- ✅ Rollback documentado
- ✅ Verificações em cada etapa

## Contatos de Suporte

Se encontrar problemas:
1. Verificar logs do Supabase
2. Executar script de verificação
3. Consultar documentação em `docs/`
4. Considerar rollback se crítico

## Conclusão

- [ ] Todas as verificações passaram
- [ ] Sistema funcionando normalmente
- [ ] Documentação atualizada
- [ ] Migration concluída com sucesso ✅
