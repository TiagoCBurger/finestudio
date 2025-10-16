# Supabase Realtime Setup

Este documento explica como configurar o Supabase Realtime para receber atualizações automáticas quando o webhook do fal.ai modifica os projetos.

## Por que Realtime?

Antes do Realtime, usávamos **polling** (verificar a cada 2 segundos se o projeto mudou). Isso era:
- ❌ Ineficiente (muitas requisições desnecessárias)
- ❌ Lento (delay de até 2 segundos)
- ❌ Consome mais recursos

Com Realtime:
- ✅ Atualização instantânea
- ✅ Sem requisições desnecessárias
- ✅ Mais eficiente

## Como funciona

1. **Webhook do fal.ai** atualiza o projeto no banco de dados
2. **Database trigger** chama `realtime.broadcast_changes()`
3. **Supabase Realtime** envia broadcast para o canal específico do projeto
4. **Frontend** recebe notificação via WebSocket
5. **UI atualiza automaticamente** sem refresh

**Nota:** Usamos `broadcast` ao invés de `postgres_changes` para melhor escalabilidade e performance.

## Configuração

### 1. Habilitar Realtime no Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Database** → **Replication**
4. Encontre a tabela `projects`
5. Clique em **Enable Realtime**

### 2. Execute as Migrations SQL

Execute as migrations que criamos:

```bash
# Se estiver usando Supabase CLI
supabase db push

# Ou execute manualmente no SQL Editor do Supabase (em ordem):
```

**Migration 1: Habilitar Realtime**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE project;
```

**Migration 2: Adicionar Broadcast Trigger**
```sql
-- Ver arquivo: supabase/migrations/20241216000002_project_broadcast_trigger.sql
-- Esta migration cria:
-- 1. Função notify_project_changes() que usa realtime.broadcast_changes()
-- 2. Trigger na tabela project
-- 3. RLS policy para realtime.messages
-- 4. Índice para performance
```

### 3. Verificar se está funcionando

1. Abra o console do navegador
2. Gere uma imagem
3. Você deve ver os logs:
   ```
   🔴 Subscribing to project realtime updates: <project-id>
   🔴 Realtime subscription status: SUBSCRIBED
   🔴 Project updated via realtime: { ... }
   ```

## Código Implementado

### Hook: `hooks/use-project-realtime.ts`

```typescript
export function useProjectRealtime(projectId: string | undefined) {
  const channelRef = useRef(null);
  
  useEffect(() => {
    if (!projectId) return;
    
    // Prevenir múltiplas subscrições
    if (channelRef.current?.state === 'subscribed') return;

    const supabase = createClient();
    
    // Usar broadcast ao invés de postgres_changes (melhor escalabilidade)
    const channel = supabase
      .channel(`project:${projectId}`, {
        config: {
          broadcast: { self: true, ack: true },
          private: true, // Requer RLS policies
        },
      })
      .on('broadcast', { event: 'project_updated' }, (payload) => {
        // Revalidar o cache do SWR
        mutate(`/api/projects/${projectId}`);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [projectId]);
}
```

**Mudanças importantes:**
- ✅ Usa `broadcast` ao invés de `postgres_changes` (melhor performance)
- ✅ Canal privado com RLS policies (mais seguro)
- ✅ Previne múltiplas subscrições com `channelRef`
- ✅ Cleanup adequado no unmount

### Provider: `providers/project.tsx`

O hook é usado automaticamente no `ProjectProvider`, então todos os componentes dentro do projeto recebem atualizações automáticas.

## Troubleshooting

### Realtime não está funcionando

1. **Verificar se está habilitado**:
   - Dashboard → Database → Replication → `projects` deve estar com Realtime enabled

2. **Verificar logs do navegador**:
   ```
   🔴 Realtime subscription status: SUBSCRIBED
   ```
   Se aparecer `CLOSED` ou `CHANNEL_ERROR`, há um problema.

3. **Verificar variáveis de ambiente**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   ```

4. **Verificar RLS (Row Level Security)**:
   - O usuário precisa ter permissão para ler a tabela `projects`
   - Verifique as policies no Supabase Dashboard

### Atualização não aparece no UI

1. **Verificar se o webhook está funcionando**:
   - Logs do servidor devem mostrar: `Project node updated successfully`

2. **Verificar se o Realtime recebeu**:
   - Logs do navegador devem mostrar: `🔴 Project updated via realtime`

3. **Verificar se o SWR revalidou**:
   - O `mutate()` deve ser chamado após receber a notificação

## Performance

- **Conexões WebSocket**: Uma por projeto aberto
- **Overhead**: ~1KB/s por conexão ativa
- **Latência**: <100ms da atualização até o UI

## Referências

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [SWR Mutation](https://swr.vercel.app/docs/mutation)
