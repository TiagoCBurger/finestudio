# Como Usar o RealtimeManager

## Problema Resolvido

Antes tínhamos múltiplas conexões WebSocket sendo criadas simultaneamente, causando:
- ❌ "WebSocket is closed before the connection is established"
- ❌ "Channel is in closed state"
- ❌ Timeouts constantes

Agora temos **UMA única conexão WebSocket** gerenciada centralmente.

## Uso Básico

```typescript
import { realtimeManager } from '@/lib/realtime-manager';

// Subscrever a um canal
const channel = await realtimeManager.subscribe({
  topic: 'fal_jobs:user-123',
  events: [
    {
      event: 'INSERT',
      handler: (payload) => console.log('Insert:', payload),
    },
    {
      event: 'UPDATE',
      handler: (payload) => console.log('Update:', payload),
    },
  ],
  isPrivate: true, // default: true
});

// Desinscrever
await realtimeManager.unsubscribe('fal_jobs:user-123');
```

## Migração dos Hooks Existentes

### Antes (use-queue-monitor.ts)
```typescript
const supabase = createClient();
const channel = supabase.channel(`fal_jobs:${userId}`, { ... });
await supabase.realtime.setAuth(token);
channel.subscribe(callback);
```

### Depois (use-queue-monitor.ts)
```typescript
import { realtimeManager } from '@/lib/realtime-manager';

const channel = await realtimeManager.subscribe({
  topic: `fal_jobs:${userId}`,
  events: [
    { event: 'INSERT', handler: handleJobUpdate },
    { event: 'UPDATE', handler: handleJobUpdate },
    { event: 'DELETE', handler: handleJobUpdate },
  ],
});
```

## Benefícios

1. **Uma única conexão WebSocket** - Evita conflitos
2. **Gerenciamento automático de auth** - Não precisa chamar `setAuth()` manualmente
3. **Reutilização de canais** - Se o canal já existe, reutiliza
4. **Aguarda conexão estar pronta** - Evita race conditions
5. **Cleanup automático** - Gerencia unsubscribe corretamente

## Próximos Passos

1. Migrar `hooks/use-queue-monitor.ts` para usar RealtimeManager
2. Migrar `hooks/use-project-realtime.ts` para usar RealtimeManager
3. Testar com múltiplos canais simultâneos
4. Remover código antigo de gerenciamento de conexão

## Notas Importantes

- O RealtimeManager é um **singleton** - uma única instância para toda a aplicação
- A conexão WebSocket é criada **lazy** - só quando o primeiro canal é subscrito
- Canais são **reutilizados** - se você subscrever ao mesmo tópico duas vezes, recebe o mesmo canal
- Use `realtimeManager.reset()` apenas em casos extremos (logout, por exemplo)
