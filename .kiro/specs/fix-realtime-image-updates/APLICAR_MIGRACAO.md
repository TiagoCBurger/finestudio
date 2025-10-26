# Como Aplicar a Migração - Correção de Erros JSON

## Arquivo da Migração
`supabase/migrations/20241224000003_fix_json_type_errors_in_trigger.sql`

## Erros que Serão Corrigidos

1. ❌ `COALESCE could not convert type jsonb to json`
2. ❌ `operator does not exist: json = json`
3. ❌ `operator does not exist: json ? unknown`

## Opção 1: Supabase CLI (Recomendado)

```bash
# Aplicar todas as migrações pendentes
supabase db push

# Ou aplicar apenas esta migração específica
supabase migration up --version 20241224000003
```

## Opção 2: Supabase Dashboard

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie e cole o conteúdo do arquivo `supabase/migrations/20241224000003_fix_json_type_errors_in_trigger.sql`
5. Clique em **Run** ou pressione `Ctrl+Enter`

## Opção 3: Linha de Comando SQL

### Local (Supabase Local)
```bash
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20241224000003_fix_json_type_errors_in_trigger.sql
```

### Remoto (Supabase Cloud)
```bash
# Obtenha a connection string no Dashboard: Settings > Database > Connection string
psql "postgresql://postgres:[SUA-SENHA]@[SEU-HOST].supabase.co:5432/postgres" \
  -f supabase/migrations/20241224000003_fix_json_type_errors_in_trigger.sql
```

## Verificação Após Aplicar

### 1. Verificar que a função foi atualizada
Execute no SQL Editor:

```sql
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'notify_project_changes';
```

**Procure por**:
- ✅ `(NEW.content::jsonb)` - casts para jsonb
- ✅ `OLD.content::text IS DISTINCT FROM NEW.content::text` - cast para text
- ✅ Blocos `BEGIN...EXCEPTION...END` - tratamento de erros

### 2. Testar salvamento de projeto
1. Abra sua aplicação
2. Faça qualquer alteração em um projeto (mova um nó, edite texto, etc.)
3. Aguarde o auto-save
4. **Esperado**: ✅ Sem erros
5. **Esperado**: ✅ Alterações salvas com sucesso

### 3. Verificar logs
No Supabase Dashboard → Logs → Postgres Logs:

**Antes da correção**:
```
❌ ERROR: COALESCE could not convert type jsonb to json
❌ ERROR: operator does not exist: json = json
```

**Depois da correção**:
```
✅ [REALTIME] projects trigger invoked: topic=project:...
✅ [REALTIME] projects UPDATE details: project_id=..., node_count=...
✅ [REALTIME] projects broadcast SUCCESS: topic=project:...
```

## O Que Foi Corrigido

### Problema 1: COALESCE com tipos incompatíveis
**Antes**:
```sql
v_node_count := jsonb_array_length(COALESCE(NEW.content->'nodes', '[]'::jsonb));
```

**Depois**:
```sql
BEGIN
  v_node_count := jsonb_array_length((NEW.content::jsonb)->'nodes');
EXCEPTION WHEN OTHERS THEN
  v_node_count := 0;
END;
```

### Problema 2: Comparação de tipo JSON
**Antes**:
```sql
IF OLD.content IS DISTINCT FROM NEW.content THEN
```

**Depois**:
```sql
IF OLD.content::text IS DISTINCT FROM NEW.content::text THEN
```

### Problema 3: Operador ? com tipo JSON
**Antes**:
```sql
IF NEW.content ? 'nodes' THEN
```

**Depois**:
```sql
IF (NEW.content::jsonb) ? 'nodes' THEN
```

## Por Que Esses Erros Aconteceram?

A coluna `project.content` é do tipo `json` (não `jsonb`):
```typescript
// schema.ts
content: json('content'),
```

PostgreSQL tem operadores e funções diferentes para `json` vs `jsonb`:
- ✅ `jsonb` tem operadores: `?`, `@>`, `->`, `->>`, etc.
- ❌ `json` não tem esses operadores
- ❌ `json` não tem operador de igualdade `=`

**Solução**: Fazer cast explícito quando necessário:
- `json::jsonb` para usar operadores jsonb
- `json::text` para comparações

## Troubleshooting

### Erro: "migration already applied"
A migração já foi aplicada. Verifique com:
```sql
SELECT version FROM supabase_migrations.schema_migrations 
WHERE version = '20241224000003';
```

### Erro: "function notify_project_changes does not exist"
Aplique as migrações anteriores primeiro:
```bash
supabase db push
```

### Ainda vendo erros após aplicar
1. Verifique se a função foi realmente atualizada (ver Verificação #1)
2. Reinicie sua aplicação
3. Limpe o cache do navegador
4. Verifique os logs do Supabase para novos erros

## Próximos Passos

Após aplicar a migração com sucesso:

1. ✅ Teste salvamento de projetos
2. ✅ Teste geração de imagens (que atualiza projetos)
3. ✅ Teste sincronização multi-tab
4. ✅ Monitore logs para novos problemas
5. ✅ Prossiga com testes abrangentes (Task 11)

## Suporte

Se encontrar problemas:
1. Verifique os logs do PostgreSQL no Dashboard
2. Execute as queries de verificação acima
3. Revise a documentação em `DATABASE_TRIGGER_FIXES_COMPLETE.md`
4. Verifique se todas as migrações anteriores foram aplicadas
