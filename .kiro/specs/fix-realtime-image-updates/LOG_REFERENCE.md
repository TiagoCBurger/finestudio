# Diagnostic Logging Reference

## Quick Reference for Log Prefixes

### Database Logs (PostgreSQL)

All database logs use the `[REALTIME]` prefix and can be found in:
- **Local**: Docker logs (`docker logs -f supabase_db_<project> 2>&1 | grep REALTIME`)
- **Remote**: Supabase Dashboard > Logs > Postgres Logs (filter by `[REALTIME]`)

**fal_jobs trigger logs**:
```
[REALTIME] fal_jobs trigger invoked: topic=%, operation=%, job_id=%, user_id=%, timestamp=%
[REALTIME] fal_jobs INSERT details: job_id=%, status=%, model_id=%, type=%, request_id=%
[REALTIME] fal_jobs UPDATE details: job_id=%, old_status=%, new_status=%, old_completed_at=%, new_completed_at=%
[REALTIME] fal_jobs broadcast SUCCESS: topic=%, operation=%, job_id=%, timestamp=%
[REALTIME] fal_jobs broadcast FAILED: topic=%, operation=%, job_id=%, error=%, sqlstate=%, detail=%, hint=%, context=%
[REALTIME] fal_jobs trigger completed: job_id=%, broadcast_result=%, duration_ms=%
```

**projects trigger logs**:
```
[REALTIME] projects trigger invoked: topic=%, operation=%, project_id=%, timestamp=%
[REALTIME] projects UPDATE details: project_id=%, node_count=%, old_updated_at=%, new_updated_at=%
[REALTIME] projects content changed: project_id=%, content_size_old=%, content_size_new=%
[REALTIME] projects nodes structure present in NEW content
[REALTIME] projects INSERT details: project_id=%, node_count=%, user_id=%
[REALTIME] projects broadcast SUCCESS: topic=%, operation=%, project_id=%, timestamp=%
[REALTIME] projects broadcast FAILED: topic=%, operation=%, project_id=%, error=%, sqlstate=%, detail=%, hint=%, context=%
[REALTIME] projects trigger completed: project_id=%, broadcast_result=%, duration_ms=%
```

### Client-Side Logs (Browser Console)

**QueueMonitor logs** (`hooks/use-queue-monitor.ts`):
```javascript
[REALTIME-DIAGNOSTIC] QueueMonitor broadcast received: {
  timestamp, userId, type, jobId, oldStatus, newStatus, 
  hasNew, hasOld, requestId, modelId
}

[REALTIME-DIAGNOSTIC] Jobs state BEFORE update: {
  timestamp, userId, jobId, type, count, jobIds, statuses
}

[REALTIME-DIAGNOSTIC] Jobs state AFTER update: {
  timestamp, userId, jobId, type, count, jobIds, 
  wasAdded, wasRemoved, wasUpdated, isDuplicate, countChange
}

[REALTIME-DIAGNOSTIC] Invalid payload received: {
  userId, payloadType, timestamp
}

[REALTIME-DIAGNOSTIC] INSERT event without newJob: { timestamp, userId }
[REALTIME-DIAGNOSTIC] UPDATE event without newJob: { timestamp, userId }
[REALTIME-DIAGNOSTIC] DELETE event without oldJob: { timestamp, userId }
[REALTIME-DIAGNOSTIC] Unknown event type: { timestamp, userId, type }

[REALTIME-DIAGNOSTIC] Deduplication: Job already exists, skipping INSERT: {
  timestamp, userId, jobId, existingJob
}

[REALTIME-DIAGNOSTIC] Job status changed: {
  timestamp, userId, jobId, oldStatus, newStatus
}

✅ Job completed: { jobId, requestId, type, modelId }
⚠️ Suprimindo toast de erro (falso positivo): { jobId, requestId, error, reason }

➕ [QueueMonitor] Adding job optimistically: { jobId, requestId, status, type }
⚠️ [QueueMonitor] Job already exists, skipping: jobId
```

**ProjectRealtime logs** (`hooks/use-project-realtime.ts`):
```javascript
[REALTIME-DIAGNOSTIC] ProjectRealtime broadcast received: {
  timestamp, projectId, type, hasNew, hasOld, table, schema, payloadType
}

[REALTIME-DIAGNOSTIC] Invalid payload received: {
  timestamp, projectId, payloadType, payload
}

[REALTIME-DIAGNOSTIC] Payload validation passed: {
  timestamp, projectId, type, table, schema, 
  hasNew, hasOld, newKeys, oldKeys
}

[REALTIME-DIAGNOSTIC] Calling mutate() BEFORE: {
  timestamp, projectId, cacheKey, revalidate, optimisticData
}

[REALTIME-DIAGNOSTIC] mutate() called successfully AFTER: {
  timestamp, projectId, cacheKey, success, timeSinceBroadcast
}

[REALTIME-DIAGNOSTIC] mutate() FAILED: {
  timestamp, projectId, error, errorStack
}
```

### Webhook Logs (Server Console)

**v1 webhook logs** (`app/api/webhooks/kie/route.ts`):
```
[WEBHOOK-V1] Webhook received: { timestamp, requestId, status, step }
[WEBHOOK-V1] Job found: { timestamp, jobId, userId, status, step }
[WEBHOOK-V1] Starting storage upload: { timestamp, userId, imageUrl, step }
[WEBHOOK-V1] Image downloaded: { timestamp, userId, sizeBytes, step }
[WEBHOOK-V1] Storage upload complete: { timestamp, userId, url, type, step }
[WEBHOOK-V1] Updating job status: { timestamp, jobId, status, step }
[WEBHOOK-V1] Job status updated: { timestamp, jobId, status, step }
[WEBHOOK-V1] updateProjectNode called: { timestamp, jobId, nodeId, projectId, imageUrl, step }
[WEBHOOK-V1] No project metadata found: { timestamp, jobId, hasNodeId, hasProjectId, step }
[WEBHOOK-V1] Fetching project from database: { timestamp, projectId, step }
[WEBHOOK-V1] Project fetched: { timestamp, projectId, hasContent, step }
[WEBHOOK-V1] Invalid project content structure: { timestamp, projectId, hasContent, isNodesArray, step }
[WEBHOOK-V1] Searching for target node: { timestamp, projectId, nodeId, totalNodes, nodeIds, step }
[WEBHOOK-V1] Target node not found: { timestamp, projectId, nodeId, availableNodeIds, step }
[WEBHOOK-V1] Target node found, updating: { timestamp, projectId, nodeId, nodeType, currentData, step }
[WEBHOOK-V1] Calling database.update() on projects: { timestamp, projectId, nodeId, imageUrl, updatedNodeData, step }
[WEBHOOK-V1] database.update() complete: { timestamp, projectId, nodeId, imageUrl, updateResult, step }
```

## Log Flow Diagrams

### Job Creation Flow (Test 4.2)

```
1. User clicks "Generate"
   ↓
2. Server Action creates job
   ↓
3. Database INSERT into fal_jobs
   ↓
4. [REALTIME] fal_jobs trigger invoked (DB)
   ↓
5. [REALTIME] fal_jobs broadcast SUCCESS (DB)
   ↓
6. [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received (Browser)
   ↓
7. [REALTIME-DIAGNOSTIC] Jobs state BEFORE update (Browser)
   ↓
8. [REALTIME-DIAGNOSTIC] Jobs state AFTER update (Browser)
   ↓
9. UI updates (job appears in queue)
```

### Job Completion Flow (Test 4.3)

```
1. KIE.ai webhook callback
   ↓
2. [WEBHOOK-V1] Webhook received (Server)
   ↓
3. [WEBHOOK-V1] Storage upload complete (Server)
   ↓
4. Database UPDATE fal_jobs (status=completed)
   ↓
5. [REALTIME] fal_jobs trigger invoked (DB)
   ↓
6. [REALTIME] fal_jobs broadcast SUCCESS (DB)
   ↓
7. [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received (Browser)
   ↓
8. ✅ Job completed (Browser)
   ↓
9. [WEBHOOK-V1] Calling database.update() on projects (Server)
   ↓
10. Database UPDATE projects (content.nodes)
    ↓
11. [REALTIME] projects trigger invoked (DB)
    ↓
12. [REALTIME] projects broadcast SUCCESS (DB)
    ↓
13. [REALTIME-DIAGNOSTIC] ProjectRealtime broadcast received (Browser)
    ↓
14. [REALTIME-DIAGNOSTIC] Calling mutate() BEFORE (Browser)
    ↓
15. [REALTIME-DIAGNOSTIC] mutate() called successfully AFTER (Browser)
    ↓
16. SWR revalidates (fetches fresh data)
    ↓
17. Component re-renders with new image
    ↓
18. UI updates (image appears in node)
```

## Filtering Logs

### PostgreSQL (Local)

```bash
# All realtime logs
docker logs -f supabase_db_<project> 2>&1 | grep "\[REALTIME\]"

# Only fal_jobs logs
docker logs -f supabase_db_<project> 2>&1 | grep "\[REALTIME\] fal_jobs"

# Only projects logs
docker logs -f supabase_db_<project> 2>&1 | grep "\[REALTIME\] projects"

# Only broadcast SUCCESS
docker logs -f supabase_db_<project> 2>&1 | grep "broadcast SUCCESS"

# Only broadcast FAILED
docker logs -f supabase_db_<project> 2>&1 | grep "broadcast FAILED"

# Specific job ID
docker logs -f supabase_db_<project> 2>&1 | grep "job_id=<YOUR_JOB_ID>"

# Specific project ID
docker logs -f supabase_db_<project> 2>&1 | grep "project_id=<YOUR_PROJECT_ID>"
```

### Browser Console

```javascript
// Filter by prefix
// In DevTools Console, use the filter box:
[REALTIME-DIAGNOSTIC]
[WEBHOOK-V1]
✅
❌
⚠️

// Or use console methods
console.log = (function(originalLog) {
  return function(...args) {
    if (args[0]?.includes?.('[REALTIME-DIAGNOSTIC]')) {
      originalLog.apply(console, args);
    }
  };
})(console.log);
```

### Server Logs (Next.js)

```bash
# In terminal where npm run dev is running
# Logs appear automatically

# To save to file
npm run dev 2>&1 | tee server.log

# Filter for webhook logs
npm run dev 2>&1 | grep "\[WEBHOOK-V1\]"
```

## Common Log Patterns

### Successful Job Creation

**Database**:
```
[REALTIME] fal_jobs trigger invoked: topic=fal_jobs:user123, operation=INSERT, job_id=abc123
[REALTIME] fal_jobs INSERT details: job_id=abc123, status=pending, model_id=google/nano-banana
[REALTIME] fal_jobs broadcast SUCCESS: topic=fal_jobs:user123, operation=INSERT, job_id=abc123
[REALTIME] fal_jobs trigger completed: job_id=abc123, broadcast_result=true, duration_ms=5
```

**Browser**:
```javascript
[REALTIME-DIAGNOSTIC] QueueMonitor broadcast received: {
  type: "INSERT", jobId: "abc123", newStatus: "pending", hasNew: true
}
[REALTIME-DIAGNOSTIC] Jobs state AFTER update: {
  count: 1, wasAdded: true, isDuplicate: false
}
```

### Successful Job Completion

**Server**:
```
[WEBHOOK-V1] Webhook received: { requestId: "req123", status: "completed" }
[WEBHOOK-V1] Storage upload complete: { url: "https://..." }
[WEBHOOK-V1] Calling database.update() on projects: { projectId: "proj123", nodeId: "node456" }
[WEBHOOK-V1] database.update() complete: { success: true }
```

**Database**:
```
[REALTIME] fal_jobs trigger invoked: topic=fal_jobs:user123, operation=UPDATE, job_id=abc123
[REALTIME] fal_jobs UPDATE details: old_status=pending, new_status=completed
[REALTIME] fal_jobs broadcast SUCCESS

[REALTIME] projects trigger invoked: topic=project:proj123, operation=UPDATE
[REALTIME] projects content changed: content_size_old=1234, content_size_new=5678
[REALTIME] projects broadcast SUCCESS
```

**Browser**:
```javascript
[REALTIME-DIAGNOSTIC] QueueMonitor broadcast received: {
  type: "UPDATE", oldStatus: "pending", newStatus: "completed"
}
✅ Job completed: { jobId: "abc123", type: "image" }

[REALTIME-DIAGNOSTIC] ProjectRealtime broadcast received: {
  type: "UPDATE", hasNew: true, hasOld: true
}
[REALTIME-DIAGNOSTIC] Calling mutate() BEFORE: { projectId: "proj123" }
[REALTIME-DIAGNOSTIC] mutate() called successfully AFTER: { success: true }
```

### Failed Broadcast (Example)

**Database**:
```
[REALTIME] fal_jobs trigger invoked: topic=fal_jobs:user123, operation=INSERT
[REALTIME] fal_jobs broadcast FAILED: error=function realtime.broadcast_changes does not exist, sqlstate=42883
[REALTIME] fal_jobs trigger completed: broadcast_result=false
```

This indicates the `realtime.broadcast_changes` function is not available (migration not applied).

### Missing Logs (Example Issues)

**Issue 1: No database logs at all**
- Migration not applied
- PostgreSQL log level too high
- Docker logs not accessible

**Issue 2: Database logs present, but no browser logs**
- WebSocket connection failed
- Subscription not active
- Topic mismatch
- RLS policy blocking

**Issue 3: Browser logs present, but UI not updating**
- React state not updating
- Component not re-rendering
- SWR cache issue

## Debugging Commands

### Check Migration Status

```bash
# List applied migrations
supabase db migrations list

# Check if diagnostic logging migration is applied
supabase db migrations list | grep enhance_diagnostic_logging
```

### Check Trigger Functions

```sql
-- Check if trigger functions exist
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname IN ('notify_fal_job_changes', 'notify_project_changes');

-- Check if triggers are attached
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgfoid::regproc as function_name
FROM pg_trigger
WHERE tgname LIKE '%broadcast%';
```

### Check Realtime Connection

```javascript
// In browser console
// Check if Supabase client is initialized
console.log('Supabase:', window.supabase);

// Check realtime channels
console.log('Channels:', window.supabase?.realtime?.channels);

// Check connection state
Object.values(window.supabase?.realtime?.channels || {}).forEach(channel => {
  console.log('Channel:', channel.topic, 'State:', channel.state);
});
```

### Check RLS Policies

```sql
-- Check realtime.messages policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'messages' AND schemaname = 'realtime';
```

## Tips for Effective Debugging

1. **Start from the beginning**: Check database logs first, then client logs
2. **Use timestamps**: Match timestamps between database and client logs
3. **Check all steps**: Don't assume a step worked - verify with logs
4. **Save logs**: Copy logs to a file for analysis
5. **Test incrementally**: Test one feature at a time
6. **Use multiple tabs**: Test multi-tab sync to verify broadcasts work
7. **Check network tab**: Look for WebSocket connection and API calls
8. **Clear cache**: Sometimes SWR cache can cause confusion

## Next Steps

After collecting logs:
1. Compare actual logs with expected logs (from this reference)
2. Identify missing logs (which step failed)
3. Document findings in TESTING_GUIDE.md template
4. Proceed to Task 5 (Analyze logs and identify root cause)
