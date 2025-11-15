# Plano de Migração: Drizzle → Supabase

## Situação Atual

O projeto usa **Drizzle ORM** em paralelo com **Supabase**, criando duplicação:
- `schema.ts` (Drizzle) - usado em 30+ arquivos
- `lib/database.types.ts` (Supabase) - tipos gerados automaticamente
- `lib/database/queries.ts` (Supabase) - queries estruturadas

## Arquivos que Usam Drizzle

### Actions (Server Actions)
- `app/actions/image/describe.ts`
- `app/actions/image/edit.ts`
- `app/actions/project/update.ts`
- `app/actions/video/create.ts`
- `app/actions/profile/update.ts`
- `app/actions/project/create.ts`
- `app/actions/project/delete.ts`
- `app/actions/speech/create.ts`
- `app/actions/speech/transcribe.ts`

### Pages (Server Components)
- `app/(authenticated)/projects/page.tsx`
- `app/(authenticated)/welcome/page.tsx`
- `app/(authenticated)/projects/[projectId]/page.tsx`

### API Routes
- `app/api/fal-jobs/route.ts`
- `app/api/webhooks/fal/route.ts`
- `app/api/webhooks/kie/route.ts`
- `app/api/projects/[projectId]/route.ts`

### Components (Server Components)
- `components/top-right.tsx`
- `components/top-left.tsx`
- `components/project-settings.tsx` (apenas tipos)
- `components/project-selector.tsx` (apenas tipos)
- `components/top-left-client.tsx` (apenas tipos)
- `components/top-right-client.tsx` (apenas tipos)

### Lib Files
- `lib/auth.ts`
- `lib/database.ts` (configuração Drizzle)
- `lib/credits/transactions.ts`
- `lib/fal-jobs.ts`
- `lib/webhooks/image-webhook-handler.ts`
- `lib/models/image/provider-base.ts`

### Providers
- `providers/project.tsx` (apenas tipos)

## Estratégia de Migração

### Fase 1: Preparação (Sem Quebrar)
1. ✅ Manter ambos os sistemas funcionando
2. ✅ Expandir `lib/database/queries.ts` com todas as queries necessárias
3. ✅ Criar helpers para tipos compatíveis

### Fase 2: Migração Gradual
1. **Migrar Actions primeiro** (menos impacto)
2. **Migrar API Routes**
3. **Migrar Pages**
4. **Migrar Components**
5. **Migrar Lib Files**

### Fase 3: Limpeza
1. Remover `schema.ts`
2. Remover `lib/database.ts`
3. Remover dependências Drizzle
4. Atualizar `package.json`

## Vantagens da Migração

### ✅ Benefícios
- **Menos complexidade**: Um só sistema de banco
- **Melhor performance**: Queries otimizadas do Supabase
- **Tipos automáticos**: Gerados pelo CLI do Supabase
- **Realtime nativo**: Integração perfeita
- **Menos dependências**: Remove drizzle-orm, drizzle-kit, pg

### ⚠️ Riscos
- **Refatoração grande**: 30+ arquivos para alterar
- **Possíveis bugs**: Durante a transição
- **Tempo de desenvolvimento**: Várias horas de trabalho

## Recomendação

**NÃO remover agora** se:
- O sistema está funcionando bem
- Você tem deadlines apertados
- A equipe não tem tempo para testes extensivos

**Remover gradualmente** se:
- Você quer simplificar a arquitetura
- Tem tempo para fazer a migração com calma
- Quer aproveitar melhor os recursos do Supabase

## Alternativa: Manter Ambos

Você pode manter os dois sistemas coexistindo:
- **Drizzle**: Para queries complexas e transações
- **Supabase**: Para realtime e queries simples

Isso não é ideal, mas funciona e evita a refatoração grande.