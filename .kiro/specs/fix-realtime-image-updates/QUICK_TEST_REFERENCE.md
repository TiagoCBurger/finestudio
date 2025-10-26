# Quick Test Reference - KIE.ai Realtime Fixes

## 🚀 Quick Start

### Before Testing
```bash
# 1. Start development server
npm run dev

# 2. Verify Supabase is running
# Check Supabase dashboard or local instance

# 3. Open browser DevTools (F12)
# Go to Console tab
```

### Run System Check
Execute this SQL in Supabase SQL Editor:
```sql
-- Quick system check
SELECT 'Triggers' as check, COUNT(*) as count 
FROM pg_trigger WHERE tgname LIKE '%broadcast%'
UNION ALL
SELECT 'RLS Policies', COUNT(*) 
FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'realtime'
UNION ALL
SELECT 'Recent Jobs', COUNT(*) 
FROM fal_jobs WHERE created_at > NOW() - INTERVAL '1 hour';
```

Expected results:
- Triggers: 2 (fal_jobs_broadcast_trigger, projects_broadcast_trigger)
- RLS Policies: 2+ (SELECT and INSERT on realtime.messages)
- Recent Jobs: Any number (shows system is working)

## ✅ Test 1: Single Tab Flow (5 minutes)

### Steps
1. **Open app** → Navigate to a project
2. **Add image node** → Enter prompt: "a beautiful sunset"
3. **Select model** → Choose "🍌 Nano Banana (Kie.ai)"
4. **Click Generate** → Watch console logs

### What to Look For

**Within 500ms**:
```
✅ [OPTIMISTIC] Adding job to queue
OR
✅ [REALTIME] Job update received: { type: "INSERT" }
```
→ Job appears in queue monitor (top-right)

**After 10-30 seconds**:
```
✅ [WEBHOOK] Processing KIE.ai webhook
✅ [REALTIME] Job update received: { type: "UPDATE", newStatus: "completed" }
✅ [REALTIME] Project update received
✅ [REALTIME] Calling mutate()
```
→ Image appears in node automatically

### Pass Criteria
- ✅ Job in queue within 500ms
- ✅ Job status updates to "completed"
- ✅ Image appears without refresh
- ✅ No errors in console

## ✅ Test 2: Multi-Tab Sync (5 minutes)

### Steps
1. **Open Tab 1** → Navigate to project
2. **Open Tab 2** → Navigate to SAME project
3. **Position side-by-side** → See both tabs
4. **In Tab 1** → Generate image
5. **Watch Tab 2** → Should update automatically

### What to Look For in Tab 2

**Within 1 second of Tab 1 generation**:
```
✅ [REALTIME] Job update received: { type: "INSERT" }
```
→ Job appears in Tab 2 queue

**When job completes**:
```
✅ [REALTIME] Job update received: { type: "UPDATE" }
✅ [REALTIME] Project update received
```
→ Image appears in Tab 2 node

### Pass Criteria
- ✅ Tab 2 queue updates within 1s
- ✅ Tab 2 shows job completion
- ✅ Tab 2 shows image without refresh
- ✅ No duplicate jobs

## ✅ Test 3: Error Handling (3 minutes)

### Test 3a: Invalid Model
1. Open DevTools Console
2. Try to generate with invalid model (if possible)
3. **Expected**: Clear error message, no crash

### Test 3b: Network Disconnect
1. Start generation
2. **Immediately** set Network to "Offline" (DevTools Network tab)
3. Wait 5 seconds
4. Set back to "Online"
5. **Expected**: System recovers, job completes

### Pass Criteria
- ✅ Errors show clear messages
- ✅ No application crash
- ✅ System recovers from network issues

## 🐛 Common Issues & Solutions

### Issue: Job doesn't appear in queue
**Check**:
```javascript
// Console should show:
[OPTIMISTIC] Adding job to queue
// OR
[REALTIME] Job update received
```
**Solution**: Check if `useQueueMonitor` is subscribed

### Issue: Image doesn't appear
**Check**:
```javascript
// Console should show:
[REALTIME] Project update received
[REALTIME] Calling mutate()
```
**Solution**: Check if `useProjectRealtime` is subscribed

### Issue: Multi-tab not syncing
**Check**:
- Both tabs authenticated?
- RLS policies allow SELECT on `realtime.messages`?
- Check Supabase Realtime settings

### Issue: "Cannot read properties of undefined (reading 'map')"
**Fixed**: This bug has been fixed in the latest code
**If still occurs**: Check console for detailed error logs

### Issue: "Database operation failed"
**Fixed**: Enhanced validation added
**If still occurs**: Check console for "🔴 Project update failed" log

## 📊 Console Log Patterns

### Normal Operation
```
🔍 [ImageNode] State check
➕ [QueueMonitor] Adding job optimistically
[REALTIME-DIAGNOSTIC] QueueMonitor broadcast received
[REALTIME-DIAGNOSTIC] ProjectRealtime broadcast received
✅ Image loaded successfully
```

### Error Patterns
```
❌ [timestamp] Error in handleGenerate
🔴 Project update failed - FULL ERROR
⚠️ Suprimindo toast de erro (falso positivo)
```

## 📝 Quick Checklist

Before reporting issues, verify:
- [ ] Development server running
- [ ] Supabase connected
- [ ] KIE.ai API key in `.env`
- [ ] Browser console open
- [ ] No ad blockers interfering
- [ ] Webhook endpoint accessible (if local)

## 🎯 Performance Targets

| Metric | Target | Acceptable |
|--------|--------|------------|
| Job appears in queue | < 500ms | < 1s |
| Image appears after completion | < 1s | < 2s |
| Multi-tab sync | < 1s | < 2s |

## 📚 Full Documentation

For detailed testing procedures, see:
- `COMPREHENSIVE_TEST_GUIDE.md` - Complete test procedures
- `test-execution-checklist.md` - Detailed checklist
- `verify-system-state.sql` - Database verification
- `HOTFIX_MAP_AND_DB_ERRORS.md` - Bug fixes applied

## 🆘 Need Help?

1. Check console logs for `[REALTIME-DIAGNOSTIC]` messages
2. Run `verify-system-state.sql` to check configuration
3. Review `HOTFIX_MAP_AND_DB_ERRORS.md` for known issues
4. Check Supabase dashboard logs for backend errors
