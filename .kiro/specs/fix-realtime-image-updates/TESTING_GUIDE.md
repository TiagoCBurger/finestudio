# Testing Guide for Realtime Image Updates

## Overview

This document provides step-by-step instructions for testing the diagnostic logging implementation for realtime image updates. The goal is to identify where the realtime update chain is failing.

## Prerequisites

1. **Development environment running**:
   - Next.js development server: `npm run dev` or `pnpm dev`
   - Supabase local instance OR connected to remote Supabase project
   - KIE.ai API configured with valid credentials

2. **Browser setup**:
   - Open browser DevTools (F12)
   - Navigate to Console tab
   - Enable "Preserve log" to keep logs across page navigations

3. **Database logs access**:
   - **Local Supabase**: Check Docker logs with `docker logs supabase_db_<project>`
   - **Remote Supabase**: Go to Dashboard > Logs > Postgres Logs
   - Filter for `[REALTIME]` prefix to see diagnostic logs

## Test 4.2: Job Creation Flow with KIE.ai

### Objective
Verify that when a new image generation job is created, it appears in the queue monitor via realtime updates.

### Steps

1. **Open the application**
   - Navigate to a project page
   - Open browser DevTools Console
   - Clear console logs

2. **Generate an image using KIE.ai**
   - Click on an image node or create a new one
   - Enter a prompt (e.g., "a beautiful sunset over mountains")
   - Select a KIE.ai model:
     - `google/nano-banana` (recommended for testing)
     - `google/nano-banana-edit` (for image editing)
   - Click "Generate" button

3. **Collect browser console logs**
   - Look for logs with these prefixes:
     - `[REALTIME-DIAGNOSTIC]` - Client-side diagnostic logs
     - `[QueueMonitor]` - Queue monitor specific logs
     - `➕` - Optimistic job addition logs
     - `✅` - Success indicators
     - `❌` - Error indicators

   **Expected logs sequence**:
   ```
   [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received:
     - timestamp: <ISO timestamp>
     - userId: <user ID>
     - type: "INSERT"
     - jobId: <job ID>
     - newStatus: "pending"
     - hasNew: true
     - hasOld: false
   
   [REALTIME-DIAGNOSTIC] Jobs state BEFORE update:
     - count: <number>
     - jobIds: [<existing job IDs>]
   
   [REALTIME-DIAGNOSTIC] Jobs state AFTER update:
     - count: <number + 1>
     - jobIds: [<new job ID>, <existing job IDs>]
     - wasAdded: true
   ```

4. **Collect database logs**
   
   **For Local Supabase**:
   ```bash
   # Find your Supabase DB container
   docker ps | grep supabase_db
   
   # View logs (replace with your container name)
   docker logs -f supabase_db_<project> 2>&1 | grep REALTIME
   ```
   
   **For Remote Supabase**:
   - Go to Supabase Dashboard
   - Navigate to: Project > Logs > Postgres Logs
   - Filter by: `[REALTIME]`
   - Time range: Last 15 minutes

   **Expected database logs**:
   ```
   [REALTIME] fal_jobs trigger invoked:
     - topic: fal_jobs:<user_id>
     - operation: INSERT
     - job_id: <job ID>
     - user_id: <user ID>
     - timestamp: <timestamp>
   
   [REALTIME] fal_jobs INSERT details:
     - job_id: <job ID>
     - status: pending
     - model_id: google/nano-banana
     - type: image
     - request_id: <request ID>
   
   [REALTIME] fal_jobs broadcast SUCCESS:
     - topic: fal_jobs:<user_id>
     - operation: INSERT
     - job_id: <job ID>
     - timestamp: <timestamp>
   
   [REALTIME] fal_jobs trigger completed:
     - job_id: <job ID>
     - broadcast_result: true
     - duration_ms: <milliseconds>
   ```

5. **Verify UI update**
   - Check if the job appears in the queue monitor (top-right corner)
   - Job should show:
     - Status: "pending" or "generating"
     - Model: "google/nano-banana"
     - Prompt: Your entered prompt
   - Note: If job appears immediately, it might be from optimistic update (not realtime)

6. **Document findings**
   - ✅ **Success**: Job appears in queue without page refresh
   - ❌ **Failure**: Job does NOT appear (requires page refresh)
   
   **If failure, identify which step failed**:
   - [ ] Database INSERT successful? (check database logs)
   - [ ] Trigger fired? (check for `[REALTIME] fal_jobs trigger invoked`)
   - [ ] Broadcast sent? (check for `[REALTIME] fal_jobs broadcast SUCCESS`)
   - [ ] Client received broadcast? (check for `[REALTIME-DIAGNOSTIC] QueueMonitor broadcast received`)
   - [ ] State updated? (check for `[REALTIME-DIAGNOSTIC] Jobs state AFTER update`)
   - [ ] UI rendered? (check if job visible in queue monitor)

### Expected Results

**✅ PASS Criteria**:
- Database logs show trigger fired and broadcast sent
- Browser console shows broadcast received
- Job appears in queue monitor without refresh
- All diagnostic logs present in correct sequence

**❌ FAIL Criteria**:
- Missing logs at any step in the chain
- Job does NOT appear in queue (requires refresh)
- Error logs present

### Common Issues

1. **No database logs visible**
   - Check if migration was applied: `supabase db migrations list`
   - Check PostgreSQL log level: Should be at least `log` level
   - For local: Check Docker logs are accessible
   - For remote: Check Supabase Dashboard permissions

2. **No browser console logs**
   - Check if DevTools Console is open
   - Check if "Preserve log" is enabled
   - Refresh page and try again

3. **Job appears but no realtime logs**
   - This indicates optimistic update is working
   - But realtime might still be broken
   - Check if job appears in OTHER tabs (multi-tab test)

## Test 4.3: Job Completion Flow with KIE.ai

### Objective
Verify that when KIE.ai webhook completes a job, the image appears in the node via realtime updates.

### Steps

1. **Wait for webhook callback**
   - After generating image in Test 4.2, wait for completion
   - KIE.ai typically takes 10-30 seconds
   - Watch for status change in queue monitor

2. **Collect webhook logs**
   - Check Next.js server logs (terminal where `npm run dev` is running)
   - Look for `[WEBHOOK-V1]` prefix

   **Expected webhook logs**:
   ```
   [WEBHOOK-V1] Webhook received:
     - timestamp: <timestamp>
     - requestId: <request ID>
     - status: completed
   
   [WEBHOOK-V1] Starting storage upload:
     - userId: <user ID>
     - imageUrl: <KIE.ai URL>
   
   [WEBHOOK-V1] Image downloaded:
     - sizeBytes: <bytes>
   
   [WEBHOOK-V1] Storage upload complete:
     - url: <permanent URL>
   
   [WEBHOOK-V1] updateProjectNode called:
     - jobId: <job ID>
     - nodeId: <node ID>
     - projectId: <project ID>
     - imageUrl: <permanent URL>
   
   [WEBHOOK-V1] Calling database.update() on projects:
     - projectId: <project ID>
     - nodeId: <node ID>
     - imageUrl: <permanent URL>
   
   [WEBHOOK-V1] database.update() complete:
     - projectId: <project ID>
     - success: true
   ```

3. **Collect database logs for fal_jobs UPDATE**
   
   **Expected logs**:
   ```
   [REALTIME] fal_jobs trigger invoked:
     - topic: fal_jobs:<user_id>
     - operation: UPDATE
     - job_id: <job ID>
   
   [REALTIME] fal_jobs UPDATE details:
     - job_id: <job ID>
     - old_status: pending
     - new_status: completed
   
   [REALTIME] fal_jobs broadcast SUCCESS:
     - topic: fal_jobs:<user_id>
     - operation: UPDATE
     - job_id: <job ID>
   ```

4. **Collect database logs for projects UPDATE**
   
   **Expected logs**:
   ```
   [REALTIME] projects trigger invoked:
     - topic: project:<project_id>
     - operation: UPDATE
     - project_id: <project ID>
   
   [REALTIME] projects UPDATE details:
     - project_id: <project ID>
     - node_count: <number>
     - old_updated_at: <old timestamp>
     - new_updated_at: <new timestamp>
   
   [REALTIME] projects content changed:
     - project_id: <project ID>
     - content_size_old: <bytes>
     - content_size_new: <bytes>
   
   [REALTIME] projects broadcast SUCCESS:
     - topic: project:<project_id>
     - operation: UPDATE
     - project_id: <project ID>
   ```

5. **Collect browser console logs**
   
   **Expected logs**:
   ```
   [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received:
     - type: "UPDATE"
     - jobId: <job ID>
     - oldStatus: "pending"
     - newStatus: "completed"
   
   ✅ Job completed:
     - jobId: <job ID>
     - requestId: <request ID>
     - type: image
     - modelId: google/nano-banana
   
   [REALTIME-DIAGNOSTIC] ProjectRealtime broadcast received:
     - projectId: <project ID>
     - type: "UPDATE"
     - hasNew: true
     - hasOld: true
   
   [REALTIME-DIAGNOSTIC] Calling mutate() BEFORE:
     - projectId: <project ID>
     - cacheKey: /api/projects/<project_id>
   
   [REALTIME-DIAGNOSTIC] mutate() called successfully AFTER:
     - projectId: <project ID>
     - success: true
   ```

6. **Verify UI update**
   - Check if image appears in the node
   - Image should load without page refresh
   - Node should show:
     - Generated image
     - No loading spinner
     - No "Generate" button (or button available for new generation)

7. **Document findings**
   - ✅ **Success**: Image appears without refresh
   - ❌ **Failure**: Image does NOT appear (requires refresh)
   
   **If failure, identify which step failed**:
   - [ ] Webhook received? (check server logs)
   - [ ] Storage upload successful? (check `[WEBHOOK-V1] Storage upload complete`)
   - [ ] fal_jobs UPDATE successful? (check database logs)
   - [ ] fal_jobs broadcast sent? (check `[REALTIME] fal_jobs broadcast SUCCESS`)
   - [ ] projects UPDATE successful? (check database logs)
   - [ ] projects broadcast sent? (check `[REALTIME] projects broadcast SUCCESS`)
   - [ ] Client received project broadcast? (check `[REALTIME-DIAGNOSTIC] ProjectRealtime broadcast received`)
   - [ ] mutate() called? (check `[REALTIME-DIAGNOSTIC] Calling mutate()`)
   - [ ] SWR revalidated? (check network tab for API call)
   - [ ] Component re-rendered? (check if image visible)

### Expected Results

**✅ PASS Criteria**:
- All webhook logs present
- All database logs present (fal_jobs and projects)
- All browser console logs present
- Image appears in node without refresh

**❌ FAIL Criteria**:
- Missing logs at any step
- Image does NOT appear (requires refresh)
- Error logs present

## Test 4.4: Multi-Tab Synchronization

### Objective
Verify that realtime updates work across multiple browser tabs.

### Steps

1. **Open two tabs**
   - Tab 1: Open project page
   - Tab 2: Open same project page in new tab
   - Position tabs side-by-side if possible

2. **Generate image in Tab 1**
   - Follow steps from Test 4.2
   - Use KIE.ai model (google/nano-banana)

3. **Watch Tab 2**
   - Check if job appears in queue monitor
   - Check browser console for realtime logs

4. **Wait for completion**
   - Watch both tabs
   - Check if image appears in both tabs

5. **Collect logs from both tabs**
   - Tab 1 logs (where generation started)
   - Tab 2 logs (passive observer)

6. **Document findings**
   - ✅ **Success**: Both tabs show job and image without refresh
   - ❌ **Failure**: Tab 2 does NOT update (requires refresh)

### Expected Results

**✅ PASS Criteria**:
- Tab 2 receives same broadcasts as Tab 1
- Job appears in Tab 2 queue monitor
- Image appears in Tab 2 node
- No page refresh needed in Tab 2

**❌ FAIL Criteria**:
- Tab 2 does not receive broadcasts
- Tab 2 requires manual refresh
- Different behavior between tabs

## Troubleshooting

### No Database Logs

**Local Supabase**:
```bash
# Check if container is running
docker ps | grep supabase

# Check PostgreSQL log level
docker exec -it supabase_db_<project> psql -U postgres -c "SHOW log_min_messages;"

# Should be 'log' or lower. If not, set it:
docker exec -it supabase_db_<project> psql -U postgres -c "ALTER SYSTEM SET log_min_messages = 'log';"
docker restart supabase_db_<project>
```

**Remote Supabase**:
- Check Dashboard > Logs > Postgres Logs
- Ensure you have proper permissions
- Try filtering by different time ranges

### No Browser Console Logs

1. **Check if DevTools is open**: Press F12
2. **Check Console tab**: Should be selected
3. **Check "Preserve log"**: Should be enabled
4. **Check log level**: Should show "Verbose" or "All levels"
5. **Refresh page**: Try again after refresh

### Realtime Connection Issues

```javascript
// Check connection status in browser console
console.log('Realtime status:', window.supabase?.realtime?.channels)
```

If no channels or disconnected:
1. Check network tab for WebSocket connection
2. Check for CORS errors
3. Check Supabase credentials in `.env`
4. Check if realtime is enabled in Supabase Dashboard

## Next Steps

After completing all tests, proceed to:
- **Task 5**: Analyze logs and identify root cause
- Document which step(s) in the chain are failing
- Propose specific fixes based on findings

## Log Collection Template

Use this template to document your findings:

```markdown
## Test Results: [Test Name]

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Local/Remote]

### Test 4.2: Job Creation Flow

**Result**: ✅ PASS / ❌ FAIL

**Database Logs**:
- [ ] Trigger invoked
- [ ] Broadcast sent
- [ ] No errors

**Browser Console Logs**:
- [ ] Broadcast received
- [ ] State updated
- [ ] No errors

**UI Behavior**:
- [ ] Job appears in queue
- [ ] No refresh needed

**Issues Found**:
[Describe any issues]

**Missing Logs**:
[List any expected logs that didn't appear]

### Test 4.3: Job Completion Flow

[Same structure as above]

### Test 4.4: Multi-Tab Sync

[Same structure as above]

## Summary

**Overall Status**: ✅ All tests passed / ❌ Some tests failed

**Root Cause Hypothesis**:
[Based on missing logs, describe where you think the chain is breaking]

**Recommended Fixes**:
[List specific fixes to try]
```
