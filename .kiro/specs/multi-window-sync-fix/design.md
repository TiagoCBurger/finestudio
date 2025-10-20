# Design Document

## Overview

Este documento descreve o design da solução para corrigir o problema de sincronização em tempo real entre múltiplas janelas/abas. O sistema atual usa Supabase Realtime com broadcast triggers, mas há um problema que impede que as atualizações sejam propagadas corretamente entre janelas diferentes.

### Problema Identificado

Quando um usuário move um nó em uma janela:
1. ✅ A alteração é salva no banco de dados Supabase
2. ✅ O trigger `projects_broadcast_trigger` é disparado
3. ❓ O broadcast pode ou não estar sendo enviado corretamente
4. ❌ Outras janelas abertas não recebem a atualização

### Hipóteses de Causa

1. **Trigger não está chamando `realtime.broadcast_changes()` corretamente**
   - A função pode ter erro de sintaxe ou permissões
   - O cast `::text` pode estar causando problemas

2. **Políticas RLS bloqueando broadcasts**
   - A política `users_can_receive_project_broadcasts` pode ter lógica incorreta
   - O `SPLIT_PART` pode não estar extraindo o ID corretamente

3. **Configuração do canal incorreta**
   - `private: true` requer autenticação via `setAuth()`
   - Se a autenticação falhar silenciosamente, broadcasts não chegam

4. **Problema de timing**
   - O broadcast pode estar sendo enviado antes do cliente estar pronto
   - Pode haver race condition entre save e subscription

## Architecture

### Componentes Envolvidos

```
┌─────────────────┐
│   Janela A      │
│  (User Action)  │
└────────┬────────┘
         │
         │ 1. Update project
         ▼
┌─────────────────────────────────┐
│   Supabase Database             │
│                                 │
│   project table                 │
│   ├─ UPDATE content             │
│   └─ TRIGGER fires              │
│                                 │
│   notify_project_changes()      │
│   └─ realtime.broadcast_changes │
└────────┬────────────────────────┘
         │
         │ 2. Broadcast via Realtime
         ▼
┌─────────────────────────────────┐
│   Supabase Realtime Server      │
│                                 │
│   Channel: project:${id}        │
│   Event: project_updated        │
│                                 │
│   RLS Check:                    │
│   └─ realtime.messages SELECT   │
└────────┬────────────────────────┘
         │
         │ 3. Deliver to subscribers
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Janela A    │ │  Janela B    │ │  Janela C    │
│  (self:false)│ │  ✅ Receives │ │  ✅ Receives │
│  ❌ Ignores  │ │  broadcast   │ │  broadcast   │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Fluxo de Dados

1. **Client → Database**
   - User action triggers `mutate()` in SWR
   - API route updates `project` table
   - Database trigger fires automatically

2. **Database → Realtime**
   - `notify_project_changes()` function executes
   - Calls `realtime.broadcast_changes()` with:
     - Topic: `project:${project_id}`
     - Event: `project_updated`
     - Payload: NEW and OLD row data

3. **Realtime → Clients**
   - Realtime server checks RLS policies on `realtime.messages`
   - Broadcasts to all subscribed clients (except sender if `self: false`)
   - Clients receive payload and call `mutate()` to refresh data

## Components and Interfaces

### 1. Database Trigger Function

**Current Implementation:**
```sql
CREATE OR REPLACE FUNCTION notify_project_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'project:' || COALESCE(NEW.id, OLD.id)::text,
    TG_OP,
    'project_updated',
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

**Potential Issues:**
- `::text` cast may be unnecessary since `id` is already `text` type
- No error handling - if `realtime.broadcast_changes()` fails, it fails silently
- `SECURITY DEFINER` means it runs with creator's permissions, not caller's

**Proposed Enhancement:**
```sql
CREATE OR REPLACE FUNCTION notify_project_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_topic text;
  v_project_id text;
BEGIN
  -- Extract project ID
  v_project_id := COALESCE(NEW.id, OLD.id);
  v_topic := 'project:' || v_project_id;
  
  -- Log for debugging (can be removed in production)
  RAISE LOG 'Broadcasting to topic: %, operation: %', v_topic, TG_OP;
  
  -- Broadcast changes
  BEGIN
    PERFORM realtime.broadcast_changes(
      v_topic,
      TG_OP,
      'project_updated',
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to broadcast changes: %', SQLERRM;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

### 2. RLS Policies

**Current SELECT Policy:**
```sql
CREATE POLICY "users_can_receive_project_broadcasts" 
ON realtime.messages
FOR SELECT 
TO authenticated
USING (
  topic LIKE 'project:%' AND
  EXISTS (
    SELECT 1 FROM project
    WHERE id::text = SPLIT_PART(topic, ':', 2)
    AND (user_id = auth.uid()::text OR auth.uid()::text = ANY(members))
  )
);
```

**Potential Issues:**
- `id::text` cast is unnecessary (id is already text)
- `auth.uid()::text` cast may cause type mismatch
- No index on `(user_id, members)` for fast lookups (already exists, but verify)

**Proposed Enhancement:**
```sql
-- Drop old policy
DROP POLICY IF EXISTS "users_can_receive_project_broadcasts" ON realtime.messages;

-- Create optimized policy
CREATE POLICY "users_can_receive_project_broadcasts" 
ON realtime.messages
FOR SELECT 
TO authenticated
USING (
  topic ~ '^project:[a-f0-9-]+$' AND  -- More specific pattern matching
  EXISTS (
    SELECT 1 FROM project
    WHERE id = SPLIT_PART(topic, ':', 2)
    AND (
      user_id = (auth.uid())::text 
      OR (auth.uid())::text = ANY(members)
    )
  )
);

-- Ensure index exists for performance
CREATE INDEX IF NOT EXISTS idx_project_user_id ON project(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members ON project USING GIN(members);
```

### 3. Client Hook (useProjectRealtime)

**Current Configuration:**
```typescript
const channel = supabase.channel(`project:${projectId}`, {
  config: {
    broadcast: {
      self: false,  // Don't receive own broadcasts
      ack: true     // Wait for server acknowledgment
    },
    private: true,  // Requires authentication
  },
})
```

**Potential Issues:**
- `self: false` means the window that makes the change won't receive the broadcast
  - This is actually CORRECT behavior - the window already has the latest data
  - Other windows should receive it
- `private: true` requires `setAuth()` to be called before subscribing
  - If auth fails, subscription silently fails
- No explicit error handling for subscription failures

**Proposed Enhancement:**
```typescript
// Add explicit error handling and logging
const channel = supabase
  .channel(`project:${projectId}`, {
    config: {
      broadcast: {
        self: false,  // Keep this - correct behavior
        ack: true
      },
      private: true,
    },
  })
  .on('broadcast', { event: 'project_updated' }, (payload) => {
    realtimeLogger.info('📨 Broadcast received', {
      projectId,
      type: payload.type,
      timestamp: Date.now()
    });
    handleProjectUpdate(payload);
  });

// Enhanced subscription with better error handling
channel.subscribe(async (status, err) => {
  if (status === 'SUBSCRIBED') {
    realtimeLogger.success('✅ Subscribed to project channel', { projectId });
  } else if (status === 'CHANNEL_ERROR') {
    realtimeLogger.error('❌ Channel error', { 
      projectId, 
      error: err?.message,
      hint: 'Check RLS policies and authentication'
    });
  } else if (status === 'TIMED_OUT') {
    realtimeLogger.error('⏱️ Subscription timed out', { projectId });
  }
});
```

### 4. Diagnostic Tools

**New Component: Realtime Diagnostic Script**

Create a comprehensive diagnostic tool that tests each component:

```typescript
interface DiagnosticResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: Record<string, unknown>;
}

async function runDiagnostics(projectId: string): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  
  // 1. Check trigger exists
  results.push(await checkTriggerExists());
  
  // 2. Check RLS policies
  results.push(await checkRLSPolicies());
  
  // 3. Test authentication
  results.push(await checkAuthentication());
  
  // 4. Test broadcast sending
  results.push(await testBroadcastSend(projectId));
  
  // 5. Test broadcast receiving
  results.push(await testBroadcastReceive(projectId));
  
  return results;
}
```

## Data Models

### Broadcast Payload Structure

```typescript
interface BroadcastPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  commit_timestamp: string;
  
  // For INSERT and UPDATE
  new?: {
    id: string;
    name: string;
    content: ProjectContent;
    user_id: string;
    members: string[] | null;
    updated_at: string;
    // ... other fields
  };
  
  // For UPDATE and DELETE
  old?: {
    id: string;
    // ... other fields
  };
}

interface ProjectContent {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}
```

### Subscription State

```typescript
interface SubscriptionState {
  isSubscribing: boolean;
  isSubscribed: boolean;
  retryCount: number;
  lastAttemptTimestamp: number | null;
  lastError?: {
    message: string;
    timestamp: number;
  };
}
```

## Error Handling

### Error Categories

1. **Authentication Errors**
   - No session found
   - Token expired
   - `setAuth()` failed
   - **Solution:** Redirect to login or refresh token

2. **Authorization Errors (403)**
   - RLS policy blocking access
   - User not member of project
   - **Solution:** Check project membership, update RLS policies

3. **Connection Errors**
   - Network timeout
   - Realtime server unavailable
   - **Solution:** Retry with exponential backoff

4. **Trigger Errors**
   - `realtime.broadcast_changes()` not found
   - Permission denied
   - **Solution:** Check database migrations, verify function exists

### Error Recovery Strategy

```typescript
// Exponential backoff with max retries
const RETRY_DELAYS = [1000, 2000, 4000, 8000]; // ms
const MAX_RETRIES = 4;

async function subscribeWithRetry(
  channel: RealtimeChannel,
  retryCount: number = 0
): Promise<void> {
  try {
    await channel.subscribe();
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount];
      realtimeLogger.warn(`Retrying in ${delay}ms...`, { retryCount });
      await new Promise(resolve => setTimeout(resolve, delay));
      return subscribeWithRetry(channel, retryCount + 1);
    } else {
      realtimeLogger.error('Max retries exceeded', { error });
      throw error;
    }
  }
}
```

## Testing Strategy

### Unit Tests

1. **Trigger Function Test**
   ```sql
   -- Test that trigger fires on UPDATE
   UPDATE project SET content = '{"test": true}' WHERE id = 'test-id';
   -- Verify broadcast was sent (check logs)
   ```

2. **RLS Policy Test**
   ```sql
   -- Test as authenticated user
   SET LOCAL role = authenticated;
   SET LOCAL request.jwt.claims = '{"sub": "user-id"}';
   SELECT * FROM realtime.messages WHERE topic = 'project:test-id';
   -- Should return rows if user has access
   ```

### Integration Tests

1. **Multi-Window Sync Test**
   - Open two browser windows
   - Subscribe both to same project
   - Update project in Window A
   - Verify Window B receives broadcast within 1 second

2. **Broadcast Delivery Test**
   - Create two Supabase clients
   - Subscribe both to same channel
   - Send broadcast from Client A
   - Verify Client B receives it

### End-to-End Tests

1. **Full User Flow**
   - User logs in
   - Opens project in two tabs
   - Moves node in Tab 1
   - Verifies node moves in Tab 2
   - Checks console for errors

## Performance Considerations

### Optimization Strategies

1. **Debouncing Updates**
   - Don't broadcast every keystroke
   - Batch updates within 500ms window
   - Only broadcast significant changes

2. **Payload Size**
   - Current: Sends entire project content (can be large)
   - Optimization: Send only changed fields
   - Use delta updates instead of full state

3. **Connection Pooling**
   - Reuse Supabase client instance
   - Don't create new client on every render
   - Use singleton pattern

4. **Index Optimization**
   - Ensure indexes exist on:
     - `project(user_id)`
     - `project(members)` using GIN index
     - `realtime.messages(topic)`

### Monitoring

```typescript
// Track broadcast latency
const broadcastMetrics = {
  sent: Date.now(),
  received: 0,
  latency: 0
};

// On send
broadcastMetrics.sent = Date.now();

// On receive
broadcastMetrics.received = Date.now();
broadcastMetrics.latency = broadcastMetrics.received - broadcastMetrics.sent;

if (broadcastMetrics.latency > 1000) {
  realtimeLogger.warn('High broadcast latency', broadcastMetrics);
}
```

## Security Considerations

### Authentication

- All channels use `private: true`
- Requires valid JWT token via `setAuth()`
- Token refresh handled automatically by Supabase client

### Authorization

- RLS policies enforce project membership
- Users can only receive broadcasts for projects they own or are members of
- `SECURITY DEFINER` on trigger function ensures it runs with proper permissions

### Data Validation

- Validate payload structure before processing
- Sanitize user input before broadcasting
- Don't expose sensitive data in broadcasts

## Migration Plan

### Phase 1: Diagnosis (Current)
1. ✅ Create diagnostic script
2. ✅ Test trigger functionality
3. ✅ Verify RLS policies
4. ✅ Check authentication flow

### Phase 2: Fix
1. Update trigger function with error handling
2. Optimize RLS policies
3. Add explicit error handling in client
4. Improve logging

### Phase 3: Validation
1. Run multi-window sync test
2. Verify broadcasts are received
3. Check performance metrics
4. Monitor error rates

### Phase 4: Optimization
1. Implement delta updates
2. Add debouncing
3. Optimize payload size
4. Add monitoring dashboard

## Open Questions

1. **Should we send full project content or just deltas?**
   - Current: Full content (simple but inefficient)
   - Alternative: Delta updates (complex but efficient)
   - **Decision:** Start with full content, optimize later if needed

2. **Should we use `self: true` or `self: false`?**
   - `self: false`: Window that makes change doesn't receive broadcast (current)
   - `self: true`: All windows receive all broadcasts
   - **Decision:** Keep `self: false` - the originating window already has the data

3. **How to handle conflicts when multiple users edit simultaneously?**
   - Last write wins (current)
   - Operational transformation
   - CRDT (Conflict-free Replicated Data Type)
   - **Decision:** Last write wins for MVP, consider CRDT for future

4. **Should we add a "sync status" indicator in the UI?**
   - Show when broadcast is received
   - Show when connection is lost
   - Show when reconnecting
   - **Decision:** Yes, add visual feedback for better UX
