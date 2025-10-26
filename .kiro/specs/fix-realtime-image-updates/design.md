# Design Document

## Overview

Este documento descreve o design da solução para corrigir problemas de atualização em tempo real no sistema de geração de imagens. A solução foca em duas áreas principais:

1. **Diagnóstico da cadeia de atualização**: Implementar logging detalhado em cada etapa para identificar onde a propagação está falhando
2. **Correção dos pontos de falha**: Corrigir triggers, subscriptions e handlers baseado nos problemas identificados

A abordagem será incremental: primeiro diagnosticar, depois corrigir.

**Nota sobre arquitetura v2**: O sistema possui duas implementações paralelas:
- **v1 (atual)**: `app/actions/image/create.ts`, `app/api/webhooks/kie/route.ts`
- **v2 (refatorada)**: `app/actions/image/create.v2.ts`, `lib/webhooks/image-webhook-handler.ts`, `app/api/webhooks/kie/route.v2.ts`

Este design considera **ambas as versões**, mas prioriza correções na v1 (que está em uso) e garante que v2 também funcione corretamente quando for migrada.

**Nota sobre providers**: A solução é agnóstica ao provider de IA (KIE.ai, Fal.ai, Replicate, etc). A arquitetura v2 já implementa abstração via `ImageProviderBase` e factory pattern. Os testes serão realizados apenas com **KIE.ai** por ser o provider atualmente configurado, mas o código deve funcionar com qualquer provider que siga o mesmo fluxo de webhook.

## Architecture

### Cadeia de Atualização Completa

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE CRIAÇÃO DE JOB                          │
└─────────────────────────────────────────────────────────────────────┘

1. User Action (generateImageAction)
   ↓
2. createFalJob() → INSERT into fal_jobs
   ↓
3. Database Trigger: fal_jobs_broadcast_trigger
   ↓
4. realtime.broadcast_changes('fal_jobs:{user_id}', 'INSERT', ...)
   ↓
5. Supabase Realtime Server → WebSocket
   ↓
6. Client: useQueueMonitor → handleJobUpdate
   ↓
7. React State Update → UI Render

┌─────────────────────────────────────────────────────────────────────┐
│                 FLUXO DE ATUALIZAÇÃO DE IMAGEM                      │
└─────────────────────────────────────────────────────────────────────┘

1. Webhook Received (POST /api/webhooks/kie)
   ↓
2. uploadImageToStorage() → Get permanent URL
   ↓
3. updateJobWithResult() → UPDATE fal_jobs (status=completed)
   ↓
4. Database Trigger: fal_jobs_broadcast_trigger
   ↓
5. realtime.broadcast_changes('fal_jobs:{user_id}', 'UPDATE', ...)
   ↓
6. Client: useQueueMonitor → handleJobUpdate (job completed)
   ↓
7. updateProjectNode() → UPDATE projects (content.nodes[].data.generated)
   ↓
8. Database Trigger: projects_broadcast_trigger
   ↓
9. realtime.broadcast_changes('project:{project_id}', 'UPDATE', ...)
   ↓
10. Client: useProjectRealtime → handleProjectUpdate
    ↓
11. mutate('/api/projects/{id}') → SWR revalidation
    ↓
12. React State Update → UI Render (image appears)
```

### Pontos de Falha Potenciais

Cada etapa da cadeia pode falhar silenciosamente:

**Problema 1: Fila não atualiza**
- ❌ Etapa 2: Job não é criado no banco
- ❌ Etapa 3: Trigger não dispara
- ❌ Etapa 4: broadcast_changes falha
- ❌ Etapa 5: WebSocket não entrega mensagem
- ❌ Etapa 6: Cliente não está subscrito ou handler falha
- ❌ Etapa 7: Estado React não atualiza

**Problema 2: Imagem não aparece no nó**
- ❌ Etapa 7: Project não é atualizado no banco
- ❌ Etapa 8: Trigger não dispara
- ❌ Etapa 9: broadcast_changes falha
- ❌ Etapa 10: Cliente não está subscrito ou handler falha
- ❌ Etapa 11: mutate() não revalida ou API retorna dados antigos
- ❌ Etapa 12: Componente não re-renderiza com novos dados

## Components and Interfaces

### 1. Enhanced Logging System

#### Database Trigger Logging

```sql
-- Enhanced trigger with detailed logging
CREATE OR REPLACE FUNCTION fal_jobs_broadcast_trigger()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $
DECLARE
  v_user_id text;
  v_topic text;
  v_operation text;
  v_job_id text;
  v_broadcast_result boolean;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  v_topic := 'fal_jobs:' || v_user_id;
  v_operation := TG_OP;
  v_job_id := COALESCE(NEW.id, OLD.id);
  
  -- Log broadcast attempt
  RAISE LOG '[REALTIME] fal_jobs trigger: topic=%, operation=%, job_id=%, timestamp=%',
    v_topic, v_operation, v_job_id, NOW();
  
  BEGIN
    -- Attempt broadcast
    PERFORM realtime.broadcast_changes(
      v_topic,
      v_operation,
      v_operation,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    
    v_broadcast_result := true;
    RAISE LOG '[REALTIME] fal_jobs broadcast SUCCESS: topic=%, job_id=%',
      v_topic, v_job_id;
      
  EXCEPTION WHEN OTHERS THEN
    v_broadcast_result := false;
    RAISE WARNING '[REALTIME] fal_jobs broadcast FAILED: topic=%, job_id=%, error=%, detail=%',
      v_topic, v_job_id, SQLERRM, SQLSTATE;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$;
```

#### Client-Side Logging

```typescript
// Enhanced handleJobUpdate with detailed logging
const handleJobUpdate = useCallback((payload: JobUpdatePayload) => {
  const timestamp = new Date().toISOString();
  const jobId = payload.new?.id || payload.old?.id;
  
  console.log('[REALTIME] Job update received:', {
    timestamp,
    userId,
    type: payload.type,
    jobId,
    oldStatus: payload.old?.status,
    newStatus: payload.new?.status,
    hasNew: !!payload.new,
    hasOld: !!payload.old,
  });
  
  // Log state before update
  console.log('[REALTIME] Current jobs state:', {
    count: jobs.length,
    jobIds: jobs.map(j => j.id),
  });
  
  // Perform update
  setJobs(prevJobs => {
    const updated = /* ... update logic ... */;
    
    // Log state after update
    console.log('[REALTIME] Updated jobs state:', {
      count: updated.length,
      jobIds: updated.map(j => j.id),
      wasAdded: updated.length > prevJobs.length,
      wasRemoved: updated.length < prevJobs.length,
    });
    
    return updated;
  });
}, [userId, jobs]);
```

### 2. Optimistic Updates for Queue

**v1 Implementation:**
```typescript
// In generateImageAction (server) - app/actions/image/create.ts
export const generateImageAction = async (params) => {
  // ... existing code ...
  
  // Return job_id in response for optimistic update
  return {
    nodeData: {
      // ... existing data ...
      jobId, // NEW: Include job ID for optimistic update
      requestId,
    },
  };
};

// In image transform component (client)
const handleGenerate = async () => {
  const result = await generateImageAction(params);
  
  if ('nodeData' in result && result.nodeData.jobId) {
    // Optimistically add job to queue
    addJobOptimistically({
      id: result.nodeData.jobId,
      requestId: result.nodeData.requestId,
      status: 'pending',
      type: 'image',
      modelId: params.modelId,
      input: { prompt: params.prompt },
      createdAt: new Date().toISOString(),
      completedAt: null,
      result: null,
      error: null,
    });
  }
};
```

**v2 Implementation:**
```typescript
// In generateImageActionV2 - app/actions/image/create.v2.ts
export async function generateImageActionV2(params) {
  // ... existing code ...
  
  const result = await provider.generateImage({...});
  
  // Result already includes jobId in state
  return result; // { state: { status: 'generating', jobId, requestId } }
}

// In image transform component (client)
const handleGenerate = async () => {
  const result = await generateImageActionV2(params);
  
  if ('state' in result && result.state.jobId) {
    // Optimistically add job to queue
    addJobOptimistically({
      id: result.state.jobId,
      requestId: result.state.requestId,
      status: 'pending',
      type: 'image',
      modelId: params.modelId,
      input: { prompt: params.prompt },
      createdAt: new Date().toISOString(),
      completedAt: null,
      result: null,
      error: null,
    });
  }
};
```

### 3. Enhanced Project Update Handler

```typescript
// In useProjectRealtime
const handleProjectUpdate = useCallback((payload: ProjectUpdatePayload) => {
  const timestamp = new Date().toISOString();
  
  console.log('[REALTIME] Project update received:', {
    timestamp,
    projectId,
    type: payload.type,
    hasNew: !!payload.new,
    hasOld: !!payload.old,
  });
  
  // Log before mutate
  console.log('[REALTIME] Calling mutate() for project:', {
    projectId,
    cacheKey: `/api/projects/${projectId}`,
    timestamp,
  });
  
  try {
    // Force revalidation
    mutate(`/api/projects/${projectId}`, undefined, { 
      revalidate: true,
      optimisticData: undefined, // Don't use optimistic data, fetch fresh
    });
    
    console.log('[REALTIME] mutate() called successfully:', {
      projectId,
      timestamp,
    });
  } catch (error) {
    console.error('[REALTIME] mutate() failed:', {
      projectId,
      error: error instanceof Error ? error.message : error,
      timestamp,
    });
  }
}, [projectId]);
```

### 4. Fallback Polling Mechanism

```typescript
// In image node component
const useFallbackPolling = (requestId: string | undefined, isGenerating: boolean) => {
  useEffect(() => {
    if (!requestId || !isGenerating) return;
    
    console.log('[POLLING] Starting fallback polling:', { requestId });
    
    const interval = setInterval(async () => {
      try {
        console.log('[POLLING] Checking job status:', { requestId });
        
        const response = await fetch(`/api/fal-jobs/${requestId}`);
        const job = await response.json();
        
        if (job.status === 'completed' || job.status === 'failed') {
          console.log('[POLLING] Job finished, stopping polling:', {
            requestId,
            status: job.status,
          });
          
          // Trigger manual refresh
          mutate(`/api/projects/${projectId}`);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('[POLLING] Error checking job:', { requestId, error });
      }
    }, 5000); // Poll every 5 seconds
    
    return () => {
      console.log('[POLLING] Cleanup:', { requestId });
      clearInterval(interval);
    };
  }, [requestId, isGenerating, projectId]);
};
```

## Data Models

### Enhanced Job Payload

```typescript
interface JobUpdatePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  new?: {
    id: string;
    requestId: string;
    userId: string;
    modelId: string;
    type: 'image' | 'video';
    status: 'pending' | 'completed' | 'failed';
    input: {
      prompt?: string;
      _metadata?: {
        nodeId: string;
        projectId: string;
      };
    };
    result?: {
      images?: Array<{ url: string }>;
    };
    error?: string;
    createdAt: string;
    completedAt?: string;
  };
  old?: {
    // Same structure as new
  };
  // Metadata for debugging
  _debug?: {
    triggeredAt: string;
    triggerName: string;
    broadcastSuccess: boolean;
  };
}
```

### Enhanced Project Payload

```typescript
interface ProjectUpdatePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  new?: {
    id: string;
    userId: string;
    content: {
      nodes: Array<{
        id: string;
        type: string;
        data: {
          generated?: {
            url: string;
            type: string;
          };
          loading?: boolean;
          status?: string;
          requestId?: string;
          updatedAt?: string;
        };
      }>;
      edges: unknown[];
      viewport: unknown;
    };
    updatedAt: string;
  };
  old?: {
    // Same structure as new
  };
  // Metadata for debugging
  _debug?: {
    triggeredAt: string;
    triggerName: string;
    broadcastSuccess: boolean;
    nodeUpdated?: string; // Which node was updated
  };
}
```

## Error Handling

### Database Trigger Errors

```sql
-- Wrap broadcast in exception handler
BEGIN
  PERFORM realtime.broadcast_changes(...);
  RAISE LOG '[REALTIME] Broadcast successful';
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail transaction
  RAISE WARNING '[REALTIME] Broadcast failed: %, %', SQLERRM, SQLSTATE;
  -- Could insert into error log table here
END;
```

### Client Subscription Errors

```typescript
// In useRealtimeSubscription
const { error, retry } = useRealtimeSubscription({
  topic: `fal_jobs:${userId}`,
  event: 'INSERT',
  onMessage: handleJobUpdate,
  onError: (error) => {
    console.error('[REALTIME] Subscription error:', {
      topic: `fal_jobs:${userId}`,
      event: 'INSERT',
      error: error.message,
      type: error.type,
      timestamp: new Date().toISOString(),
    });
    
    // Show user-friendly error
    toast.error('Conexão em tempo real perdida', {
      description: 'Tentando reconectar...',
      action: {
        label: 'Recarregar',
        onClick: () => window.location.reload(),
      },
    });
  },
});
```

## Testing Strategy

### Manual Testing Checklist

**Provider Used for Testing**: KIE.ai (google/nano-banana or google/nano-banana-edit)

1. **Test Job Creation (KIE.ai)**
   - [ ] Generate image using KIE.ai model
   - [ ] Check browser console for `[REALTIME] Job update received`
   - [ ] Check database logs for `[REALTIME] fal_jobs trigger`
   - [ ] Verify job appears in queue without refresh
   - [ ] Verify job shows correct model (google/nano-banana or google/nano-banana-edit)

2. **Test Job Completion (KIE.ai)**
   - [ ] Wait for KIE.ai webhook callback
   - [ ] Check webhook logs for `updateProjectNode` calls
   - [ ] Check database logs for `[REALTIME] fal_jobs trigger` (UPDATE)
   - [ ] Check database logs for `[REALTIME] projects trigger`
   - [ ] Check browser console for `[REALTIME] Project update received`
   - [ ] Check browser console for `[REALTIME] Calling mutate()`
   - [ ] Verify image appears in node without refresh

3. **Test Multi-Tab Sync (KIE.ai)**
   - [ ] Open two tabs with same project
   - [ ] Generate image in tab 1 using KIE.ai
   - [ ] Verify queue updates in tab 2
   - [ ] Verify image appears in tab 2

4. **Test Fallback Polling (KIE.ai)**
   - [ ] Temporarily disable realtime (disconnect WebSocket)
   - [ ] Generate image using KIE.ai
   - [ ] Verify polling logs appear
   - [ ] Verify image eventually appears via polling

**Note**: While testing is done with KIE.ai, the implementation should be provider-agnostic. The same tests should work with Fal.ai or other providers once configured.

### Diagnostic Queries

```sql
-- Check if triggers exist
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE '%broadcast%';

-- Check recent fal_jobs
SELECT 
  id,
  request_id,
  user_id,
  status,
  created_at,
  completed_at
FROM fal_jobs
ORDER BY created_at DESC
LIMIT 10;

-- Check recent project updates
SELECT 
  id,
  user_id,
  updated_at,
  (content->'nodes'->0->'data'->'generated'->>'url') as first_node_image
FROM project
ORDER BY updated_at DESC
LIMIT 10;

-- Check realtime messages (if accessible)
SELECT 
  topic,
  event,
  created_at
FROM realtime.messages
WHERE topic LIKE 'fal_jobs:%' OR topic LIKE 'project:%'
ORDER BY created_at DESC
LIMIT 20;
```

## Implementation Phases

### Phase 1: Diagnostic Logging (Priority: HIGH)
- Add detailed logging to database triggers (both fal_jobs and projects)
- Add detailed logging to client handlers (useQueueMonitor, useProjectRealtime)
- Add logging to webhook processing (v1: route.ts, v2: route.v2.ts + image-webhook-handler.ts)
- Add logging to mutate() calls in useProjectRealtime
- Deploy and test with real usage
- **Applies to**: Both v1 and v2

### Phase 2: Identify Root Cause (Priority: HIGH)
- Analyze logs from Phase 1
- Identify which step(s) in the chain are failing
- Test both v1 and v2 flows separately
- Document findings with specific file/function references
- **Applies to**: Both v1 and v2

### Phase 3: Fix Identified Issues (Priority: HIGH)
- Fix database triggers if needed (shared by v1 and v2)
- Fix client subscriptions if needed (shared by v1 and v2)
- Fix webhook processing if needed:
  - v1: `app/api/webhooks/kie/route.ts`
  - v2: `lib/webhooks/image-webhook-handler.ts` + `app/api/webhooks/kie/route.v2.ts`
- Fix SWR cache invalidation if needed (shared by v1 and v2)
- **Applies to**: Both v1 and v2

### Phase 4: Optimistic Updates (Priority: MEDIUM)
- Implement optimistic job addition to queue
- Return jobId from server actions:
  - v1: Modify `generateImageAction` return value
  - v2: Already returns jobId in `result.state`
- Handle race conditions with realtime updates
- Add deduplication logic in useQueueMonitor
- **Applies to**: Both v1 and v2

### Phase 5: Fallback Polling (Priority: LOW)
- Implement polling for generating state
- Add automatic fallback when realtime fails
- Add UI indicator for polling mode
- Works with both v1 and v2 (uses same job API)
- **Applies to**: Both v1 and v2

### Phase 6: Monitoring (Priority: MEDIUM)
- Add metrics for realtime delivery success rate
- Add alerts for high failure rates
- Create dashboard for realtime health
- Track v1 vs v2 usage and success rates
- **Applies to**: Both v1 and v2

### Phase 7: v2 Migration (Priority: LOW - Future)
- Once v2 is proven stable, migrate all image generation to v2
- Remove v1 code
- Update all components to use v2 actions
- **Note**: Not part of this spec, but design considers v2 for future compatibility
