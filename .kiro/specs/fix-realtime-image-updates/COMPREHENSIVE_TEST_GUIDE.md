# Comprehensive Testing Guide - KIE.ai Realtime Fixes

## Overview
This guide provides step-by-step instructions to verify that all realtime fixes are working correctly with KIE.ai image generation.

## Prerequisites
- Development environment running (`npm run dev`)
- Supabase local instance running or connected to remote
- KIE.ai API key configured in `.env`
- Browser console open for monitoring logs
- At least one project created in the application

## Test 11.1: Complete Flow with KIE.ai (Single Tab)

### Setup
1. Open the application in a single browser tab
2. Open browser DevTools (F12) and go to Console tab
3. Navigate to a project page
4. Clear console logs for clean test run

### Test Steps

#### Step 1: Generate Image
1. Create or select an image node
2. Enter a prompt (e.g., "a beautiful sunset over mountains")
3. Select model: `google/nano-banana` or `google/nano-banana-edit`
4. Click "Generate" button
5. **Expected Result**: 
   - Node shows "Generating..." state immediately
   - Loading skeleton appears in the node

#### Step 2: Verify Job Appears in Queue (Optimistic or Realtime)
**Timing**: Within 500ms of clicking Generate

**Console Logs to Check**:
```
[OPTIMISTIC] Adding job to queue: { jobId: "...", status: "pending" }
```
OR
```
[REALTIME] Job update received: { type: "INSERT", jobId: "...", status: "pending" }
```

**Visual Verification**:
- Queue monitor (top-right) shows new job
- Job displays correct model name (google/nano-banana)
- Job shows "pending" or "generating" status
- Job has correct prompt text

**✅ PASS**: Job appears in queue within 500ms
**❌ FAIL**: Job does not appear OR takes longer than 500ms

#### Step 3: Verify Job Updates to Completed Status
**Timing**: When KIE.ai webhook is received (typically 10-30 seconds)

**Console Logs to Check**:
```
[WEBHOOK] Processing KIE.ai webhook: { requestId: "...", status: "completed" }
[WEBHOOK] Updating job status: { jobId: "...", status: "completed" }
[REALTIME] Job update received: { type: "UPDATE", jobId: "...", newStatus: "completed" }
```

**Visual Verification**:
- Job in queue updates to "completed" status
- Job shows completion timestamp
- Job remains in queue (doesn't disappear)

**✅ PASS**: Job status updates to completed automatically
**❌ FAIL**: Job stays in "pending" OR requires page refresh

#### Step 4: Verify Image Appears in Node Without Refresh
**Timing**: Immediately after job completion (within 1 second)

**Console Logs to Check**:
```
[WEBHOOK] Updating project node: { projectId: "...", nodeId: "...", imageUrl: "..." }
[REALTIME] Project update received: { projectId: "...", type: "UPDATE" }
[REALTIME] Calling mutate() for project: { projectId: "..." }
[SWR] Revalidating project data
[NODE] Image URL changed: { nodeId: "...", newUrl: "..." }
```

**Visual Verification**:
- Image appears in the node automatically
- No page refresh required
- Image is fully loaded and visible
- Node no longer shows "Generating..." state

**✅ PASS**: Image appears automatically without refresh
**❌ FAIL**: Image does not appear OR requires manual refresh

### Test 11.1 Results Template

```
Test 11.1: Complete Flow with KIE.ai (Single Tab)
Date: _______________
Tester: _______________

Step 1 - Generate Image: ☐ PASS ☐ FAIL
Notes: _________________________________

Step 2 - Job Appears in Queue: ☐ PASS ☐ FAIL
Timing: _______ ms
Method: ☐ Optimistic ☐ Realtime
Notes: _________________________________

Step 3 - Job Updates to Completed: ☐ PASS ☐ FAIL
Timing: _______ seconds
Notes: _________________________________

Step 4 - Image Appears in Node: ☐ PASS ☐ FAIL
Timing: _______ seconds after completion
Notes: _________________________________

Overall Result: ☐ PASS ☐ FAIL
```

---

## Test 11.2: Multi-Tab Synchronization with KIE.ai

### Setup
1. Open the application in TWO browser tabs
2. Navigate to the SAME project in both tabs
3. Open DevTools Console in BOTH tabs
4. Position tabs side-by-side for easy observation
5. Clear console logs in both tabs

### Test Steps

#### Step 1: Generate Image in Tab 1
1. In Tab 1, create or select an image node
2. Enter a prompt (e.g., "a serene lake with mountains")
3. Select model: `google/nano-banana`
4. Click "Generate" button

#### Step 2: Verify Queue Updates in Tab 2
**Timing**: Within 1 second of generation in Tab 1

**Tab 2 Console Logs to Check**:
```
[REALTIME] Job update received: { type: "INSERT", jobId: "...", status: "pending" }
[QUEUE] Adding job from broadcast: { jobId: "..." }
```

**Tab 2 Visual Verification**:
- Queue monitor shows new job
- Job appears without any user action in Tab 2
- Job details match Tab 1 (same prompt, model, status)

**✅ PASS**: Tab 2 queue updates automatically
**❌ FAIL**: Tab 2 requires refresh to see job

#### Step 3: Verify Job Completion Syncs to Tab 2
**Timing**: When webhook completes (10-30 seconds)

**Tab 2 Console Logs to Check**:
```
[REALTIME] Job update received: { type: "UPDATE", jobId: "...", newStatus: "completed" }
[QUEUE] Updating job from broadcast: { jobId: "...", status: "completed" }
```

**Tab 2 Visual Verification**:
- Job status updates to "completed" in Tab 2
- Update happens automatically without refresh

**✅ PASS**: Job completion syncs to Tab 2
**❌ FAIL**: Tab 2 doesn't show completion

#### Step 4: Verify Image Appears in Tab 2
**Timing**: Within 1 second of job completion

**Tab 2 Console Logs to Check**:
```
[REALTIME] Project update received: { projectId: "...", type: "UPDATE" }
[REALTIME] Calling mutate() for project
[NODE] Image URL changed: { nodeId: "...", newUrl: "..." }
```

**Tab 2 Visual Verification**:
- Image appears in the node in Tab 2
- No refresh required
- Image matches Tab 1

**✅ PASS**: Image appears in Tab 2 automatically
**❌ FAIL**: Tab 2 requires refresh to see image

### Test 11.2 Results Template

```
Test 11.2: Multi-Tab Synchronization with KIE.ai
Date: _______________
Tester: _______________

Step 1 - Generate in Tab 1: ☐ PASS ☐ FAIL
Notes: _________________________________

Step 2 - Queue Updates in Tab 2: ☐ PASS ☐ FAIL
Timing: _______ ms
Notes: _________________________________

Step 3 - Job Completion Syncs to Tab 2: ☐ PASS ☐ FAIL
Timing: _______ seconds
Notes: _________________________________

Step 4 - Image Appears in Tab 2: ☐ PASS ☐ FAIL
Timing: _______ seconds after completion
Notes: _________________________________

Overall Result: ☐ PASS ☐ FAIL
```

---

## Test 11.3: Error Scenarios

### Test 11.3a: Invalid Model ID

#### Setup
1. Open application in single tab
2. Open DevTools Console
3. Navigate to a project

#### Test Steps
1. Create or select an image node
2. Manually modify the model selector (via DevTools if needed) to use invalid model: `google/invalid-model-xyz`
3. Enter a prompt
4. Click "Generate"

#### Expected Behavior
**Console Logs to Check**:
```
[ERROR] Image generation failed: { error: "Invalid model", modelId: "google/invalid-model-xyz" }
```

**Visual Verification**:
- Error message displayed to user
- Error is clear and actionable
- Node shows error state (not stuck in "Generating...")
- Job in queue shows "failed" status OR is removed

**✅ PASS**: Error handled gracefully with clear feedback
**❌ FAIL**: Application crashes OR no error feedback

### Test 11.3b: Network Disconnection

#### Setup
1. Open application in single tab
2. Open DevTools Console
3. Navigate to a project
4. Open DevTools Network tab

#### Test Steps
1. Create or select an image node
2. Enter a prompt and select `google/nano-banana`
3. Click "Generate"
4. **IMMEDIATELY** go to Network tab and set throttling to "Offline"
5. Wait 5 seconds
6. Set throttling back to "Online"

#### Expected Behavior
**Console Logs to Check**:
```
[REALTIME] Connection lost
[REALTIME] Attempting reconnection...
[REALTIME] Reconnected successfully
```

**Visual Verification**:
- Job appears in queue (optimistic update works even offline)
- When connection restored, realtime updates resume
- Job eventually completes and image appears
- No duplicate jobs created

**✅ PASS**: System recovers from network disconnection
**❌ FAIL**: System stuck OR duplicate jobs created

### Test 11.3c: Webhook Failure Simulation

#### Setup
1. This test requires backend access to simulate webhook failure
2. Open application in single tab
3. Open DevTools Console

#### Test Steps
1. Create or select an image node
2. Enter a prompt and select `google/nano-banana`
3. Click "Generate"
4. **Simulate webhook failure** (one of):
   - Temporarily disable webhook endpoint
   - Return 500 error from webhook
   - Timeout webhook processing

#### Expected Behavior
**Console Logs to Check**:
```
[WEBHOOK] Processing failed: { error: "...", requestId: "..." }
[REALTIME] Job update received: { type: "UPDATE", status: "failed" }
```

**Visual Verification**:
- Job shows "failed" status in queue
- Error message displayed to user
- User can retry generation
- No orphaned jobs in database

**✅ PASS**: Webhook failure handled gracefully
**❌ FAIL**: Job stuck in "pending" indefinitely

### Test 11.3 Results Template

```
Test 11.3: Error Scenarios
Date: _______________
Tester: _______________

Test 11.3a - Invalid Model ID: ☐ PASS ☐ FAIL
Error Message: _________________________________
Notes: _________________________________

Test 11.3b - Network Disconnection: ☐ PASS ☐ FAIL
Recovery Time: _______ seconds
Notes: _________________________________

Test 11.3c - Webhook Failure: ☐ PASS ☐ FAIL
Error Handling: _________________________________
Notes: _________________________________

Overall Result: ☐ PASS ☐ FAIL
```

---

## Debugging Tips

### If Job Doesn't Appear in Queue
1. Check console for `[OPTIMISTIC]` or `[REALTIME]` logs
2. Verify `useQueueMonitor` is subscribed: Look for `[REALTIME] Subscribed to fal_jobs:${userId}`
3. Check database: `SELECT * FROM fal_jobs ORDER BY created_at DESC LIMIT 5;`
4. Verify trigger exists: Check Supabase logs for trigger execution

### If Image Doesn't Appear in Node
1. Check console for `[REALTIME] Project update received`
2. Check console for `[REALTIME] Calling mutate()`
3. Verify webhook processed: Look for `[WEBHOOK]` logs
4. Check database: `SELECT content FROM project WHERE id = '...'` and verify image URL in nodes
5. Check if `useProjectRealtime` is subscribed: Look for `[REALTIME] Subscribed to project:${projectId}`

### If Multi-Tab Sync Fails
1. Verify both tabs are authenticated (check `auth.uid()`)
2. Check if both tabs have active subscriptions
3. Verify RLS policies allow SELECT on `realtime.messages`
4. Check Supabase Realtime settings (private channels enabled?)

### Common Issues
- **Duplicate jobs**: Deduplication logic not working - check `jobId` comparison
- **Stale data**: SWR cache not invalidating - check `mutate()` calls
- **Missing broadcasts**: Trigger not firing - check database logs
- **Authorization errors**: RLS policies blocking - check `realtime.messages` policies

---

## Success Criteria

### All Tests Must Pass
- ✅ Test 11.1: Complete flow works in single tab
- ✅ Test 11.2: Multi-tab synchronization works
- ✅ Test 11.3: Error scenarios handled gracefully

### Performance Requirements
- Job appears in queue: < 500ms
- Image appears after completion: < 1 second
- Multi-tab sync delay: < 1 second

### Quality Requirements
- No console errors during normal operation
- No duplicate jobs created
- No memory leaks (check DevTools Memory tab)
- Proper cleanup on unmount (no lingering subscriptions)

---

## Test Execution Checklist

Before starting tests:
- [ ] Development environment running
- [ ] Supabase connected and healthy
- [ ] KIE.ai API key configured
- [ ] Browser DevTools open
- [ ] Test project created

After completing tests:
- [ ] All test results documented
- [ ] Screenshots captured for failures
- [ ] Console logs saved for analysis
- [ ] Database state verified
- [ ] Issues reported with reproduction steps

---

## Next Steps After Testing

### If All Tests Pass
1. Mark task 11 as complete
2. Proceed to task 12 (Documentation)
3. Prepare for production deployment

### If Tests Fail
1. Document exact failure point
2. Capture console logs and screenshots
3. Check database state
4. Review relevant code sections
5. Apply fixes and re-test
6. Do not proceed until all tests pass

---

## Contact & Support

If you encounter issues during testing:
1. Check the debugging tips section above
2. Review the design document for architecture details
3. Check Supabase logs for backend issues
4. Verify all migrations have been applied
5. Consult the requirements document for expected behavior
