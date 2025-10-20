# Configuração do Cliente Supabase Realtime

Este documento descreve todas as configurações do cliente Supabase relacionadas ao Realtime e como ajustá-las para diferentes cenários.

## Configuração Principal

Localização: `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';
import { realtimeLogger } from '@/lib/realtime-logger';

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const logLevel = realtimeLogger.getSupabaseLogLevel();

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        log_level: logLevel,
        eventsPerSecond: 10
      },
      timeout: 30000,
      heartbeatIntervalMs: 30000,
      reconnectAfterMs: (tries) => {
        const delay = Math.min(1000 * Math.pow(2, tries), 30000);
        realtimeLogger.log('info', 'Reconnection attempt', { tries, delay });
        return delay;
      }
    }
  });
};
```

## Parâmetros de Configuração

### 1. Log Level (`log_level`)

**Valores possíveis:** `'debug'` | `'info'` | `'warn'` | `'error'`

**Padrão:** 
- Desenvolvimento: `'info'`
- Produção: `'error'`

**Quando ajustar:**
- Use `'debug'` para troubleshooting detalhado
- Use `'info'` para desenvolvimento normal
- Use `'error'` em produção para minimizar logs

```typescript
// Desenvolvimento
log_level: 'info'

// Produção
log_level: 'error'

// Debug intensivo
log_level: 'debug'
```

### 2. Events Per Second (`eventsPerSecond`)

**Valor padrão:** `10`

**Descrição:** Limita o número de eventos que podem ser processados por segundo.

**Quando ajustar:**
- Aumente para aplicações com alta frequência de updates (ex: jogos, chat)
- Diminua para economizar recursos em aplicações com updates esporádicos

```typescript
// Alta frequência (jogos, chat em tempo real)
eventsPerSecond: 50

// Frequência normal (atualizações de dados)
eventsPerSecond: 10

// Baixa frequência (notificações ocasionais)
eventsPerSecond: 5
```

### 3. Timeout (`timeout`)

**Valor padrão:** `30000` (30 segundos)

**Descrição:** Tempo máximo para estabelecer conexão antes de timeout.

**Quando ajustar:**
- Aumente em conexões lentas ou instáveis
- Diminua para falhar mais rápido em ambientes controlados

```typescript
// Conexões lentas/instáveis
timeout: 45000  // 45 segundos

// Padrão recomendado
timeout: 30000  // 30 segundos

// Conexões rápidas/estáveis
timeout: 15000  // 15 segundos
```

### 4. Heartbeat Interval (`heartbeatIntervalMs`)

**Valor padrão:** `30000` (30 segundos)

**Descrição:** Intervalo entre heartbeats para manter conexão ativa.

**Quando ajustar:**
- Aumente para reduzir tráfego de rede
- Diminua para detectar desconexões mais rapidamente

```typescript
// Detecção rápida de desconexão
heartbeatIntervalMs: 15000  // 15 segundos

// Padrão recomendado
heartbeatIntervalMs: 30000  // 30 segundos

// Economizar banda (menos crítico)
heartbeatIntervalMs: 60000  // 60 segundos
```

### 5. Reconnect After (`reconnectAfterMs`)

**Valor padrão:** Exponential backoff com máximo de 30 segundos

**Descrição:** Função que determina o delay antes de tentar reconectar.

**Implementação atual:**
```typescript
reconnectAfterMs: (tries) => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
  const delay = Math.min(1000 * Math.pow(2, tries), 30000);
  realtimeLogger.log('info', 'Reconnection attempt', { tries, delay });
  return delay;
}
```

**Variações:**

```typescript
// Reconexão agressiva (tentar rapidamente)
reconnectAfterMs: (tries) => Math.min(500 * Math.pow(2, tries), 10000)
// 0.5s, 1s, 2s, 4s, 8s, max 10s

// Reconexão conservadora (esperar mais)
reconnectAfterMs: (tries) => Math.min(2000 * Math.pow(2, tries), 60000)
// 2s, 4s, 8s, 16s, 32s, max 60s

// Reconexão linear (sem exponential backoff)
reconnectAfterMs: (tries) => Math.min(tries * 5000, 30000)
// 5s, 10s, 15s, 20s, 25s, max 30s
```

## Configurações por Hook

### use-queue-monitor.ts

```typescript
const DEBOUNCE_DELAY = 500;      // Delay antes de tentar subscrição
const MAX_RETRIES = 3;           // Máximo de tentativas
const RETRY_DELAYS = [1000, 2000, 4000];  // Delays entre retries
```

**Quando ajustar:**

```typescript
// Ambiente instável (mais retries)
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

// Ambiente estável (menos retries)
const MAX_RETRIES = 2;
const RETRY_DELAYS = [500, 1000];

// Subscrições rápidas (menos debounce)
const DEBOUNCE_DELAY = 200;

// Subscrições conservadoras (mais debounce)
const DEBOUNCE_DELAY = 1000;
```

### use-project-realtime.ts

Usa as mesmas configurações de `use-queue-monitor.ts`.

## Configuração de Canais

### Canais Privados (Recomendado)

```typescript
const channel = supabase.channel('topic:id', {
  config: {
    broadcast: {
      self: false,  // Não receber próprios broadcasts
      ack: true     // Habilitar acknowledgments
    },
    private: true   // Requer autenticação
  }
});
```

**Quando usar:**
- Dados sensíveis ou específicos do usuário
- Quando precisa de autorização via RLS
- Produção (sempre use canais privados)

### Canais Públicos

```typescript
const channel = supabase.channel('public:announcements', {
  config: {
    broadcast: {
      self: true,   // Pode receber próprios broadcasts
      ack: false    // Sem acknowledgments
    },
    private: false  // Sem autenticação
  }
});
```

**Quando usar:**
- Dados públicos (anúncios, status do sistema)
- Desenvolvimento/testes rápidos
- Nunca para dados sensíveis

## Variáveis de Ambiente

### Obrigatórias

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

### Opcionais (para configuração avançada)

```env
# Nível de log do Realtime
NEXT_PUBLIC_REALTIME_LOG_LEVEL=info

# Timeout customizado (ms)
NEXT_PUBLIC_REALTIME_TIMEOUT=30000

# Heartbeat customizado (ms)
NEXT_PUBLIC_REALTIME_HEARTBEAT=30000
```

## Cenários de Uso

### 1. Aplicação de Chat em Tempo Real

```typescript
// lib/supabase/client.ts
realtime: {
  params: {
    log_level: 'info',
    eventsPerSecond: 50  // Alta frequência
  },
  timeout: 20000,         // Timeout mais curto
  heartbeatIntervalMs: 15000,  // Heartbeat mais frequente
  reconnectAfterMs: (tries) => Math.min(500 * Math.pow(2, tries), 10000)
}

// Hook configuration
const DEBOUNCE_DELAY = 200;  // Resposta rápida
const MAX_RETRIES = 5;       // Mais tentativas
```

### 2. Dashboard com Updates Ocasionais

```typescript
// lib/supabase/client.ts
realtime: {
  params: {
    log_level: 'error',
    eventsPerSecond: 5   // Baixa frequência
  },
  timeout: 30000,
  heartbeatIntervalMs: 60000,  // Heartbeat menos frequente
  reconnectAfterMs: (tries) => Math.min(2000 * Math.pow(2, tries), 60000)
}

// Hook configuration
const DEBOUNCE_DELAY = 1000;  // Mais conservador
const MAX_RETRIES = 3;
```

### 3. Aplicação de Colaboração (ex: Google Docs)

```typescript
// lib/supabase/client.ts
realtime: {
  params: {
    log_level: 'info',
    eventsPerSecond: 30  // Frequência média-alta
  },
  timeout: 25000,
  heartbeatIntervalMs: 20000,
  reconnectAfterMs: (tries) => Math.min(1000 * Math.pow(2, tries), 20000)
}

// Hook configuration
const DEBOUNCE_DELAY = 300;
const MAX_RETRIES = 4;
```

### 4. Monitoramento de Fila (Caso Atual)

```typescript
// lib/supabase/client.ts
realtime: {
  params: {
    log_level: 'info',
    eventsPerSecond: 10  // Frequência normal
  },
  timeout: 30000,
  heartbeatIntervalMs: 30000,
  reconnectAfterMs: (tries) => Math.min(1000 * Math.pow(2, tries), 30000)
}

// Hook configuration
const DEBOUNCE_DELAY = 500;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
```

## Troubleshooting de Configuração

### Problema: Timeouts Frequentes

**Solução:**
```typescript
// Aumentar timeout e heartbeat
timeout: 45000,
heartbeatIntervalMs: 45000,
```

### Problema: Reconexões Muito Lentas

**Solução:**
```typescript
// Reduzir delays de reconexão
reconnectAfterMs: (tries) => Math.min(500 * Math.pow(2, tries), 10000)
```

### Problema: Muitos Logs no Console

**Solução:**
```typescript
// Reduzir log level
log_level: 'error'
```

### Problema: Updates Sendo Perdidos

**Solução:**
```typescript
// Aumentar eventsPerSecond
eventsPerSecond: 20,

// Habilitar ack
broadcast: {
  ack: true
}
```

## Monitoramento

Para verificar se as configurações estão adequadas:

1. **Verifique logs do Supabase Dashboard:**
   - Vá para Logs > Realtime
   - Procure por erros ou timeouts

2. **Use o Realtime Logger:**
   ```typescript
   import { realtimeLogger } from '@/lib/realtime-logger';
   realtimeLogger.info('Status', { config });
   ```

3. **Monitore métricas:**
   - Tempo de conexão
   - Número de reconexões
   - Taxa de sucesso de subscrições

## Recursos

- [Supabase Realtime Configuration](https://supabase.com/docs/guides/realtime/settings)
- [Phoenix Channel Options](https://hexdocs.pm/phoenix/Phoenix.Channel.html)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Performance Optimizations](./PERFORMANCE_OPTIMIZATIONS.md)
