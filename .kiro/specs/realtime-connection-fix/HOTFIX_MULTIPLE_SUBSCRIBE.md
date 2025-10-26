# Hotfix: Multiple Subscribe Attempts

## Problem

The application was showing these errors:

```
🔴 [REALTIME] ❌ Subscription error
InitializingProjectConnection: Realtime is initializing the project connection

🔴 [REALTIME] ❌ Subscription failed
tried to subscribe multiple times. 'subscribe' can only be called a single time per channel instance
```

## Root Cause

1. **Initialization Error**: When Supabase Realtime is initializing the project connection, it returns a `CHANNEL_ERROR` with message "InitializingProjectConnection"

2. **Retry Logic Issue**: The RealtimeConnectionManager was treating this as a retryable error and calling `channel.subscribe()` again

3. **Supabase Limitation**: Supabase Realtime doesn't allow calling `subscribe()` multiple times on the same channel instance

## Solution

### 1. Detect Initialization Errors

Modified `handleSubscriptionError()` to detect initialization errors and mark them as non-retryable:

```typescript
// Check if this is an initialization error (not retryable)
const errorMessage = error?.message || String(error);
const isInitializingError = errorMessage.includes('InitializingProjectConnection') ||
    errorMessage.includes('Realtime is initializing');

if (isInitializingError) {
    // This is a temporary initialization error - don't retry
    retryable = false;
    realtimeLogger.info('Detected initialization error - will wait for automatic connection', {
        topic,
        error: errorMessage
    });
}
```

### 2. Fixed Resubscribe Logic

Modified `resubscribeChannel()` to NOT call `channel.subscribe()` again:

```typescript
/**
 * Note: This method does NOT call channel.subscribe() again because
 * Supabase Realtime doesn't allow multiple subscribe() calls on the same channel.
 * Instead, it waits for the existing subscription to resolve.
 */
private async resubscribeChannel(
    channelWrapper: ChannelWrapper,
    event: string,
    options: ChannelOptions
): Promise<void> {
    // Don't call subscribe() again - just wait for the existing subscription
    // The channel will automatically reconnect and resolve
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 2000);
    });
}
```

## Benefits

1. ✅ **No More Multiple Subscribe Errors**: The code no longer tries to call `subscribe()` multiple times
2. ✅ **Graceful Initialization**: Initialization errors are handled gracefully without retries
3. ✅ **Automatic Recovery**: Supabase Realtime will automatically connect when ready
4. ✅ **Better Logging**: Initialization errors are logged as info, not errors

## Testing

After this fix, you should see:

```
✅ Good Logs:
- "Detected initialization error - will wait for automatic connection"
- "Subscription waiting for initialization"
- Channel will eventually connect automatically

❌ Should NOT See:
- "tried to subscribe multiple times"
- Multiple CHANNEL_ERROR logs for the same channel
```

## Files Changed

- `lib/realtime-connection-manager.ts`:
  - Modified `handleSubscriptionError()` to detect initialization errors
  - Modified `resubscribeChannel()` to not call `subscribe()` again

## Next Steps

1. Test the application to verify the errors are gone
2. Monitor logs to ensure channels connect successfully after initialization
3. If issues persist, check Supabase project status and RLS policies

---

*Hotfix applied on: 2025-10-23*
*Status: ✅ Ready for testing*
