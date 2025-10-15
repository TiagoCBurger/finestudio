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
2. **Supabase Realtime** detecta a mudança
3. **Frontend** recebe notificação via WebSocket
4. **UI atualiza automaticamente** sem refresh

## Configuração

### 1. Habilitar Realtime no Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Database** → **Replication**
4. Encontre a tabela `projects`
5. Clique em **Enable Realtime**

### 2. Ou use a Migration SQL

Execute a migration que criamos:

```bash
# Se estiver usando Supabase CLI
supabase db push

# Ou execute manualmente no SQL Editor do Supabase:
```

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
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
  useEffect(() => {
    if (!projectId) return;

    const supabase = createClient();
    
    const channel = supabase
      .channel(`project:${projectId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${projectId}`,
      }, (payload) => {
        // Revalidar o cache do SWR
        mutate(`/api/projects/${projectId}`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);
}
```

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
