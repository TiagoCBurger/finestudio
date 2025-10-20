# Troubleshooting Guide - Supabase Realtime Timeouts

Este guia fornece soluções para problemas comuns relacionados a timeouts e erros de conexão no Supabase Realtime.

## Problemas Comuns

### 1. Erro TIMED_OUT ao Conectar

**Sintomas:**
- Console mostra erro `TIMED_OUT` ao tentar se conectar a um canal
- Mensagens não são recebidas em tempo real
- Múltiplas tentativas de conexão falhando

**Causas Possíveis:**
1. Múltiplas tentativas de subscrição simultâneas
2. Falta de debouncing nas subscrições
3. Timeout padrão muito curto
4. Problemas de autenticação em canais privados

**Soluções:**

#### A. Verificar Implementação de Debouncing
Certifique-se de que o hook está usando debouncing adequado:

```typescript
const DEBOUNCE_DELAY = 500; // ms
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  // Limpar timer anterior
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }

  // Agendar subscrição com debounce
  debounceTimerRef.current = setTimeout(() => {
    // Lógica de subscrição aqui
  }, DEBOUNCE_DELAY);

  return () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };
}, [dependencies]);
```

#### B. Verificar Estado do Canal Antes de Subscrever
Sempre verifique se já existe uma subscrição ativa:

```typescript
const channelState = channelRef.current?.state;
const isChannelJoined = channelState === REALTIME_CHANNEL_STATES.joined;

if (isChannelJoined || subscriptionState.isSubscribed) {
  console.log('Já subscrito, pulando tentativa');
  return;
}
```

#### C. Configurar Timeout Adequado
No arquivo `lib/supabase/client.ts`:

```typescript
realtime: {
  timeout: 30000, // 30 segundos
  heartbeatIntervalMs: 30000,
  reconnectAfterMs: (tries) => Math.min(1000 * Math.pow(2, tries), 30000)
}
```

### 2. Erro de Autenticação em Canais Privados

**Sintomas:**
- Erro 403 ou CHANNEL_ERROR
- Mensagem sobre falta de permissão
- Canais privados não conectam

**Causas Possíveis:**
1. `setAuth()` não foi chamado antes de `subscribe()`
2. Token de sessão expirado
3. Políticas RLS incorretas

**Soluções:**

#### A. Sempre Chamar setAuth() Antes de Subscribe
```typescript
// Obter sessão atual
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  console.error('Usuário não autenticado');
  return;
}

// Definir auth antes de subscrever
await supabase.realtime.setAuth(session.access_token);

// Agora pode subscrever
channel.subscribe();
```

#### B. Verificar Políticas RLS
Certifique-se de que as políticas em `realtime.messages` estão corretas:

```sql
-- Política para leitura (SELECT)
CREATE POLICY "users_can_read_own_channels" ON realtime.messages
FOR SELECT TO authenticated
USING (
  topic LIKE 'fal_jobs:%' AND
  SPLIT_PART(topic, ':', 2) = auth.uid()::text
);

-- Política para escrita (INSERT)
CREATE POLICY "users_can_write_own_channels" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  topic LIKE 'fal_jobs:%' AND
  SPLIT_PART(topic, ':', 2) = auth.uid()::text
);
```

### 3. Múltiplas Subscrições Simultâneas

**Sintomas:**
- Várias tentativas de conexão ao mesmo tempo
- Logs mostram múltiplas tentativas
- Performance degradada

**Causas Possíveis:**
1. useEffect sendo executado múltiplas vezes
2. Falta de verificação de estado
3. Dependências incorretas no useEffect

**Soluções:**

#### A. Usar Refs para Rastrear Estado
```typescript
const subscriptionStateRef = useRef({
  isSubscribing: false,
  isSubscribed: false,
  retryCount: 0,
  lastAttemptTimestamp: null
});

// Verificar antes de subscrever
if (subscriptionStateRef.current.isSubscribing) {
  console.log('Já tentando subscrever, pulando');
  return;
}
```

#### B. Implementar Verificação de Timestamp
```typescript
const now = Date.now();
const timeSinceLastAttempt = now - state.lastAttemptTimestamp;
const minRetryDelay = RETRY_DELAYS[state.retryCount];

if (timeSinceLastAttempt < minRetryDelay) {
  console.log('Muito cedo para tentar novamente');
  return;
}
```

### 4. Reconexão Após Perda de Rede

**Sintomas:**
- Conexão não restaura após perda de rede
- Mensagens param de chegar após reconexão
- Estado inconsistente após reconexão

**Soluções:**

#### A. Implementar Retry Logic com Backoff Exponencial
```typescript
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // ms

// Verificar limite de retries
if (state.retryCount >= MAX_RETRIES) {
  console.error('Máximo de tentativas excedido');
  return;
}

// Calcular delay com backoff exponencial
const delay = RETRY_DELAYS[Math.min(state.retryCount, RETRY_DELAYS.length - 1)];
```

#### B. Resetar Contador de Retries em Sucesso
```typescript
case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
  subscriptionStateRef.current = {
    isSubscribing: false,
    isSubscribed: true,
    retryCount: 0, // Resetar em sucesso
    lastAttemptTimestamp: Date.now()
  };
  break;
```

### 5. Mensagens Não São Recebidas

**Sintomas:**
- Canal conecta com sucesso
- Mas mensagens não chegam
- Triggers do banco de dados não disparam broadcasts

**Causas Possíveis:**
1. Trigger não configurado corretamente
2. Canal privado sem políticas RLS adequadas
3. Nome do evento não corresponde

**Soluções:**

#### A. Verificar Trigger do Banco de Dados
```sql
-- Verificar se trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'fal_jobs_broadcast_trigger';

-- Verificar função do trigger
SELECT prosrc FROM pg_proc WHERE proname = 'fal_jobs_broadcast_trigger';
```

#### B. Testar Broadcast Manualmente
```sql
-- Testar broadcast direto
SELECT realtime.send(
  'fal_jobs:user-id-here',
  'INSERT',
  jsonb_build_object('test', 'data'),
  false
);
```

#### C. Verificar Nome do Evento
Certifique-se de que o evento no cliente corresponde ao do trigger:

```typescript
// Cliente
channel.on('broadcast', { event: 'INSERT' }, handler);

// Trigger deve usar o mesmo nome
PERFORM realtime.broadcast_changes(
  topic,
  'INSERT', -- Deve corresponder
  'INSERT',
  TG_TABLE_NAME,
  TG_TABLE_SCHEMA,
  NEW,
  OLD
);
```

## Ferramentas de Diagnóstico

### 1. Habilitar Logging Detalhado

No arquivo `lib/supabase/client.ts`:

```typescript
realtime: {
  params: {
    log_level: 'info', // ou 'debug' para mais detalhes
    eventsPerSecond: 10
  }
}
```

### 2. Usar o Realtime Logger

```typescript
import { realtimeLogger } from '@/lib/realtime-logger';

// Logar informações
realtimeLogger.info('Tentando conectar', { userId, projectId });

// Logar erros
realtimeLogger.error('Falha na conexão', { error: err.message });

// Logar sucesso
realtimeLogger.success('Conectado com sucesso', { channelTopic });
```

### 3. Monitorar Estado do Canal

```typescript
console.log('Estado do canal:', channel.state);
console.log('Estado da subscrição:', subscriptionStateRef.current);
```

### 4. Verificar Logs do Supabase

No dashboard do Supabase:
1. Vá para "Logs" > "Realtime"
2. Filtre por erros ou timeouts
3. Verifique timestamps para correlacionar com tentativas do cliente

## Checklist de Verificação

Ao implementar ou debugar Realtime, verifique:

- [ ] Debouncing implementado (500ms recomendado)
- [ ] Verificação de estado do canal antes de subscrever
- [ ] `setAuth()` chamado antes de `subscribe()` para canais privados
- [ ] Retry logic com backoff exponencial implementado
- [ ] Limite máximo de retries configurado (3 recomendado)
- [ ] Timeout adequado configurado (30s recomendado)
- [ ] Cleanup adequado no useEffect
- [ ] Políticas RLS configuradas corretamente
- [ ] Triggers do banco de dados funcionando
- [ ] Logging habilitado para diagnóstico

## Recursos Adicionais

- [Documentação Oficial do Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Guia de Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- [Configuração de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Steering Guide - Supabase Realtime](.kiro/steering/Supabase%20realtime.md)

## Suporte

Se os problemas persistirem após seguir este guia:

1. Verifique os logs do Supabase Dashboard
2. Teste com o script `test-realtime-fixes.js`
3. Revise o código dos hooks implementados
4. Consulte o validation report em `.kiro/specs/fix-realtime-timeout/validation-report.md`
