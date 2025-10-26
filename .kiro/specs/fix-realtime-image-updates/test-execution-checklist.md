# Test Execution Checklist

## Pre-Test Setup

### Environment Verification
- [ ] Development server running (`npm run dev`)
- [ ] Supabase instance accessible
- [ ] KIE.ai API key present in `.env`
- [ ] Webhook endpoint accessible (ngrok/tunnel if local)
- [ ] Browser DevTools ready

### Database Verification
Run these queries to verify setup:

```sql
-- Verify triggers exist
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE '%broadcast%';

-- Expected: fal_jobs_broadcast_trigger, projects_broadcast_trigger

-- Verify RLS policies on realtime.messages
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'messages' AND schemaname = 'realtime';

-- Expected: Policies for SELECT and INSERT

-- Check recent jobs
SELECT 
  id,
  request_id,
  user_id,
  model_id,
  status,
  created_at,
  completed_at
FROM fal_jobs
ORDER BY created_at DESC
LIMIT 5;
```

### Application Verification
- [ ] Can log in successfully
- [ ] Can create/access a project
- [ ] Queue monitor visible in UI
- [ ] Image nodes can be created

---

## Test 11.1: Single Tab Complete Flow

### Pre-Test
- [ ] Clear browser console
- [ ] Clear any existing jobs from queue
- [ ] Note current time: __________

### Execution
1. **Generate Image**
   - [ ] Prompt entered: _______________________
   - [ ] Model selected: google/nano-banana
   - [ ] Generate button clicked
   - [ ] Time clicked: __________

2. **Verify Queue Update**
   - [ ] Job appeared in queue
   - [ ] Time appeared: __________
   - [ ] Delay: __________ ms (should be < 500ms)
   - [ ] Method: ☐ Optimistic ☐ Realtime
   - [ ] Console log present: `[OPTIMISTIC]` or `[REALTIME] Job update received`

3. **Wait for Completion**
   - [ ] Job status changed to "completed"
   - [ ] Time completed: __________
   - [ ] Total generation time: __________ seconds
   - [ ] Console log present: `[WEBHOOK] Processing KIE.ai webhook`
   - [ ] Console log present: `[REALTIME] Job update received: { type: "UPDATE" }`

4. **Verify Image Appears**
   - [ ] Image appeared in node
   - [ ] Time appeared: __________
   - [ ] Delay after completion: __________ ms (should be < 1000ms)
   - [ ] No page refresh required
   - [ ] Console log present: `[REALTIME] Project update received`
   - [ ] Console log present: `[REALTIME] Calling mutate()`
   - [ ] Console log present: `[NODE] Image URL changed`

### Result
- [ ] **PASS** - All steps completed successfully
- [ ] **FAIL** - Failed at step: __________

### Notes
```
_____________________________________________
_____________________________________________
_____________________________________________
```

---

## Test 11.2: Multi-Tab Synchronization

### Pre-Test
- [ ] Open Tab 1 with project
- [ ] Open Tab 2 with SAME project
- [ ] Clear console in both tabs
- [ ] Position tabs side-by-side
- [ ] Note current time: __________

### Execution
1. **Generate in Tab 1**
   - [ ] Prompt entered in Tab 1: _______________________
   - [ ] Model selected: google/nano-banana
   - [ ] Generate clicked in Tab 1
   - [ ] Time clicked: __________

2. **Verify Tab 2 Queue Update**
   - [ ] Job appeared in Tab 2 queue
   - [ ] Time appeared in Tab 2: __________
   - [ ] Delay: __________ ms (should be < 1000ms)
   - [ ] Tab 2 console log: `[REALTIME] Job update received`
   - [ ] Job details match Tab 1

3. **Wait for Completion**
   - [ ] Job completed in Tab 1
   - [ ] Time completed: __________
   - [ ] Job status updated in Tab 2
   - [ ] Tab 2 console log: `[REALTIME] Job update received: { type: "UPDATE" }`

4. **Verify Image in Tab 2**
   - [ ] Image appeared in Tab 2 node
   - [ ] Time appeared: __________
   - [ ] Delay after completion: __________ ms (should be < 1000ms)
   - [ ] No refresh required in Tab 2
   - [ ] Tab 2 console log: `[REALTIME] Project update received`
   - [ ] Image matches Tab 1

### Result
- [ ] **PASS** - All steps completed successfully
- [ ] **FAIL** - Failed at step: __________

### Notes
```
_____________________________________________
_____________________________________________
_____________________________________________
```

---

## Test 11.3a: Invalid Model ID

### Pre-Test
- [ ] Clear browser console
- [ ] Note current time: __________

### Execution
1. **Attempt Generation with Invalid Model**
   - [ ] Opened DevTools Elements/Console
   - [ ] Modified model selector to: `google/invalid-model-xyz`
   - [ ] Entered prompt: _______________________
   - [ ] Clicked Generate
   - [ ] Time clicked: __________

2. **Verify Error Handling**
   - [ ] Error message displayed to user
   - [ ] Error message is clear: _______________________
   - [ ] Node shows error state (not stuck in "Generating...")
   - [ ] Console log present: `[ERROR]` or similar
   - [ ] Job in queue shows "failed" OR is removed
   - [ ] No application crash

### Result
- [ ] **PASS** - Error handled gracefully
- [ ] **FAIL** - Reason: __________

### Notes
```
_____________________________________________
_____________________________________________
```

---

## Test 11.3b: Network Disconnection

### Pre-Test
- [ ] Clear browser console
- [ ] Open Network tab in DevTools
- [ ] Note current time: __________

### Execution
1. **Start Generation**
   - [ ] Prompt entered: _______________________
   - [ ] Model selected: google/nano-banana
   - [ ] Generate clicked
   - [ ] Time clicked: __________

2. **Simulate Disconnection**
   - [ ] Immediately set Network throttling to "Offline"
   - [ ] Time set offline: __________
   - [ ] Waited 5 seconds
   - [ ] Set throttling back to "Online"
   - [ ] Time set online: __________

3. **Verify Recovery**
   - [ ] Job appeared in queue (optimistic update worked)
   - [ ] Console log: `[REALTIME] Connection lost` or similar
   - [ ] Console log: `[REALTIME] Reconnected` or similar
   - [ ] Job eventually completed
   - [ ] Image appeared after reconnection
   - [ ] No duplicate jobs created
   - [ ] Total time to completion: __________ seconds

### Result
- [ ] **PASS** - System recovered successfully
- [ ] **FAIL** - Reason: __________

### Notes
```
_____________________________________________
_____________________________________________
```

---

## Test 11.3c: Webhook Failure

### Pre-Test
- [ ] Clear browser console
- [ ] Prepare webhook failure simulation method
- [ ] Note current time: __________

### Execution
1. **Start Generation**
   - [ ] Prompt entered: _______________________
   - [ ] Model selected: google/nano-banana
   - [ ] Generate clicked
   - [ ] Time clicked: __________
   - [ ] Job appeared in queue

2. **Simulate Webhook Failure**
   - [ ] Method used: _______________________
   - [ ] Failure triggered at: __________

3. **Verify Error Handling**
   - [ ] Job shows "failed" status in queue
   - [ ] Error message displayed to user
   - [ ] Console log: `[WEBHOOK] Processing failed` or similar
   - [ ] Console log: `[REALTIME] Job update received: { status: "failed" }`
   - [ ] User can retry generation
   - [ ] No orphaned jobs in database

### Result
- [ ] **PASS** - Webhook failure handled gracefully
- [ ] **FAIL** - Reason: __________
- [ ] **SKIP** - Cannot simulate webhook failure

### Notes
```
_____________________________________________
_____________________________________________
```

---

## Post-Test Verification

### Database State Check
Run these queries after all tests:

```sql
-- Check for orphaned jobs
SELECT 
  id,
  request_id,
  status,
  created_at,
  completed_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
FROM fal_jobs
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '5 minutes';

-- Should be empty or only recent jobs

-- Check project updates
SELECT 
  id,
  updated_at,
  (content->'nodes'->0->'data'->'generated'->>'url') as first_node_image
FROM project
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- Verify recent updates have image URLs
```

### Console Log Review
- [ ] No unexpected errors in console
- [ ] All expected log patterns present
- [ ] No memory leaks (check Memory tab)
- [ ] No lingering subscriptions after unmount

### Performance Check
- [ ] Queue update latency: __________ ms (target: < 500ms)
- [ ] Image appearance latency: __________ ms (target: < 1000ms)
- [ ] Multi-tab sync latency: __________ ms (target: < 1000ms)

---

## Overall Test Results

### Summary
- Test 11.1 (Single Tab): ☐ PASS ☐ FAIL
- Test 11.2 (Multi-Tab): ☐ PASS ☐ FAIL
- Test 11.3a (Invalid Model): ☐ PASS ☐ FAIL
- Test 11.3b (Network Disconnect): ☐ PASS ☐ FAIL
- Test 11.3c (Webhook Failure): ☐ PASS ☐ FAIL ☐ SKIP

### Overall Result
- [ ] **ALL TESTS PASSED** - Ready to proceed to task 12
- [ ] **SOME TESTS FAILED** - Review failures and apply fixes

### Failed Tests Details
```
Test: __________
Failure Point: __________
Console Logs: __________
Database State: __________
Reproduction Steps: __________
```

### Next Actions
- [ ] Document all results
- [ ] Save console logs
- [ ] Take screenshots of failures
- [ ] Update task status
- [ ] Proceed to fixes OR task 12

---

## Sign-Off

**Tester Name:** _______________________
**Date:** _______________________
**Time:** _______________________
**Environment:** ☐ Local ☐ Staging ☐ Production
**Browser:** _______________________
**Supabase:** ☐ Local ☐ Remote

**Signature:** _______________________
