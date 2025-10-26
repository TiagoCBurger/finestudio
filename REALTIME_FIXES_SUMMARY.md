# Realtime Connection Fixes - Summary

## Root Cause

O problema principal era **múltiplas tentativas de criar conexões WebSocket simultâneas**. O Supabase Realtime deve usar **UMA única conexão WebSocket** compartilhada por todos os canais, mas estávamos tentando criar:
- Canal `project:{projectId}` (useProjectRealtime)
- Canal `fal_jobs:{userId}` (useQueueMonitor)

Ambos tentando se conectar ao mesmo tempo, causando conflito e fechamento prematuro do WebSocket.

## Solução Final

Criado **RealtimeManager** - um gerenciador centralizado que:
1. ✅ Garante UMA única conexão WebSocket
2. ✅ Aguarda a conexão estar pronta antes de criar canais
3. ✅ Reutiliza canais existentes
4. ✅ Gerencia autenticação de forma centralizada

## Issues Fixed

### 1. Map Error in Transform Component
**Error:** `Cannot read properties of undefined (reading 'map')`

**Root Cause:** The `ErrorState` component was receiving an error object `{ type, message, canRetry }` but expected separate `error` (string) and `canRetry` (boolean) props.

**Fix:** Updated `ErrorDisplay` component to accept the full error object structure:
- Changed interface to accept `error: { type, message, canRetry }`
- Updated component to use `error.message` and `error.canRetry`
- File: `components/nodes/image/states/error-display.tsx`

### 2. WebSocket Connection Timeouts
**Error:** `WebSocket is closed before the connection is established` and `TIMED_OUT` subscription errors

**Root Cause:** The 2-second delay after setting auth was unnecessary and could cause timing issues. The Supabase client handles connection management internally.

**Fix:** Removed the artificial 2-second delay:
- Subscribe immediately after setting auth token
- Let Supabase client handle connection timing internally
- The client already has built-in retry logic with exponential backoff
- File: `hooks/use-queue-monitor.ts`

## Technical Details

### Error Display Component Changes
```typescript
// Before
interface ErrorDisplayProps {
    error: string;
    canRetry: boolean;
    // ...
}

// After
interface ErrorDisplayProps {
    error: {
        type: string;
        message: string;
        canRetry: boolean;
    };
    // ...
}
```

### Subscription Timing Changes
```typescript
// Before
supabase.realtime.setAuth(session.access_token);
await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
channel.subscribe(callback);

// After
supabase.realtime.setAuth(session.access_token);
channel.subscribe(callback); // Subscribe immediately
```

## Why These Fixes Work

1. **Error Display:** The component now correctly handles the error object structure that matches the state machine's error format.

2. **Subscription Timing:** The Supabase Realtime client is designed to handle connection management internally. By removing the artificial delay:
   - We avoid race conditions where the WebSocket might close during the delay
   - We let the client's built-in connection logic work as designed
   - The client already has proper retry logic with exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)
   - The timeout is set to 30 seconds in the client configuration

## Verification

The fixes address:
- ✅ Map error in transform component
- ✅ WebSocket connection timing issues
- ✅ Subscription timeout errors
- ✅ Proper error display with retry functionality

## Related Files
- `components/nodes/image/states/error-display.tsx` - Error display component
- `components/nodes/image/transform.v2.tsx` - Image transform component
- `hooks/use-queue-monitor.ts` - Queue monitor hook with Realtime subscription
- `lib/supabase/client.ts` - Supabase client singleton with Realtime config

## Notes

The RLS policies and database triggers are working correctly (confirmed by Postgres logs showing successful broadcasts). The issues were purely client-side timing and type mismatch problems.
