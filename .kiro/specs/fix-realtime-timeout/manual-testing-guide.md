# Manual Testing Guide - Realtime Timeout Fixes

This guide provides step-by-step instructions for manually testing the realtime timeout fixes in a browser environment.

## Prerequisites

- Development server running (`npm run dev` or `yarn dev`)
- User account with authentication
- Browser DevTools open (F12 or Cmd+Option+I)

## Test 1: Multiple Browser Tabs (Test 5.1)

### Objective
Verify that opening multiple tabs doesn't cause TIMED_OUT errors.

### Steps

1. **Open the application in your browser**
   - Navigate to your project page (e.g., `/projects/[projectId]`)
   - Open the browser console (F12 → Console tab)

2. **Open 4 additional tabs**
   - Duplicate the tab 4 times (Cmd+T or Ctrl+T, then paste URL)
   - You should now have 5 tabs open to the same project

3. **Monitor the console in each tab**
   - Look for subscription messages in the console
   - Expected: `SUBSCRIBED - Successfully connected to...`
   - Not expected: `TIMED_OUT` errors

4. **Verify realtime updates work**
   - In one tab, trigger an action that creates a job (e.g., generate an image)
   - Check all other tabs to see if they receive the update
   - You should see toast notifications in all tabs

### Success Criteria
- ✅ All 5 tabs subscribe successfully
- ✅ No TIMED_OUT errors in any console
- ✅ Updates appear in all tabs simultaneously
- ✅ Console shows: "SUBSCRIBED - Successfully connected to..."

### What to Look For
```
✅ Good:
[Realtime] SUBSCRIBED - Successfully connected to fal_jobs channel
[Realtime] Job update received

❌ Bad:
[Realtime] TIMED_OUT - Subscription attempt timed out
[Realtime] CHANNEL_ERROR - Subscription failed
```

---

## Test 2: Network Interruption (Test 5.2)

### Objective
Verify automatic reconnection after network interruption.

### Steps

1. **Open the application**
   - Navigate to your project page
   - Open browser console
   - Wait for initial subscription: "SUBSCRIBED - Successfully connected..."

2. **Simulate network interruption**
   - Open DevTools → Network tab
   - Click "Offline" in the throttling dropdown
   - Wait 5 seconds

3. **Restore network**
   - Change throttling back to "No throttling" or "Online"
   - Watch the console for reconnection messages

4. **Verify reconnection**
   - Look for: "SUBSCRIBED - Successfully connected..."
   - Trigger an action (e.g., generate image)
   - Verify you receive updates

### Success Criteria
- ✅ Initial subscription successful
- ✅ Automatic reconnection after network restored
- ✅ Updates work after reconnection
- ✅ No manual refresh needed

### What to Look For
```
✅ Good:
[Realtime] CLOSED - Channel connection closed
[Realtime] Reconnection attempt { tries: 1, delay: 1000 }
[Realtime] SUBSCRIBED - Successfully connected...

❌ Bad:
[Realtime] Max retries exceeded, giving up
[Realtime] CHANNEL_ERROR - Subscription failed
```

---

## Test 3: Slow Network (Test 5.3)

### Objective
Verify proper behavior under slow network conditions.

### Steps

1. **Configure slow network**
   - Open DevTools → Network tab
   - Set throttling to "Slow 3G" or "Fast 3G"

2. **Open the application**
   - Navigate to your project page
   - Open browser console
   - Monitor subscription time

3. **Wait for subscription**
   - Watch for: "SUBSCRIBED - Successfully connected..."
   - Note: This may take longer than usual (up to 10 seconds)
   - Should NOT timeout (30 second limit)

4. **Test message delivery**
   - Trigger an action (e.g., generate image)
   - Verify you receive updates (may be slower)
   - Check for toast notifications

5. **Restore normal network**
   - Set throttling back to "No throttling"

### Success Criteria
- ✅ Subscription completes within 30 seconds
- ✅ No TIMED_OUT errors
- ✅ Updates received (even if slower)
- ✅ System remains stable

### What to Look For
```
✅ Good:
[Realtime] Starting subscription attempt
[Realtime] SUBSCRIBED - Successfully connected... (may take 5-10s)
[Realtime] Job update received

❌ Bad:
[Realtime] TIMED_OUT - Subscription attempt timed out
[Realtime] Max retries exceeded
```

---

## Additional Verification

### Check Subscription State

Open the console and run:
```javascript
// Check if channels are subscribed
console.log('Channels:', window.supabase?.getChannels?.())
```

Expected output: Array of channels with `state: "joined"`

### Monitor Realtime Logs

All realtime activity is logged with the `[Realtime]` prefix. Filter console by "Realtime" to see only relevant logs.

### Verify No Memory Leaks

1. Open DevTools → Memory tab
2. Take a heap snapshot
3. Open and close tabs multiple times
4. Take another heap snapshot
5. Compare - should not see significant growth in RealtimeChannel objects

---

## Common Issues and Solutions

### Issue: Still seeing TIMED_OUT errors

**Solution:**
1. Check that you're logged in (private channels require auth)
2. Verify `.env` has correct Supabase credentials
3. Check browser console for session errors
4. Try clearing browser cache and cookies

### Issue: Updates not appearing in all tabs

**Solution:**
1. Check that all tabs are subscribed (look for "SUBSCRIBED" in console)
2. Verify the user ID matches in all tabs
3. Check network tab for WebSocket connection (should be open)

### Issue: Slow subscription times

**Solution:**
1. Check your network connection
2. Verify Supabase project is not rate-limited
3. Check for browser extensions blocking WebSockets
4. Try in incognito mode

---

## Automated Testing

For automated testing, run:
```bash
node test-realtime-fixes.js
```

This will run all three test scenarios automatically and provide a detailed report.

---

## Success Indicators

### Console Output (Good)
```
[Realtime] Scheduling subscription attempt with debounce
[Realtime] Starting subscription attempt
[Realtime] Channel created, getting session
[Realtime] Session found, setting auth for realtime
[Realtime] Auth set for realtime, subscribing to channel
[Realtime] SUBSCRIBED - Successfully connected to fal_jobs channel
[Realtime] Job update received
```

### Console Output (Bad)
```
[Realtime] TIMED_OUT - Subscription attempt timed out
[Realtime] CHANNEL_ERROR - Subscription failed
[Realtime] Max retries exceeded, giving up
[Realtime] Error during subscription process
```

---

## Reporting Issues

If you encounter issues during testing:

1. **Capture console logs**
   - Right-click in console → "Save as..."
   - Include all `[Realtime]` messages

2. **Note the scenario**
   - Which test were you running?
   - What were you doing when the error occurred?
   - Can you reproduce it consistently?

3. **Check network tab**
   - Look for failed WebSocket connections
   - Check for 403 or 401 errors

4. **Provide environment details**
   - Browser and version
   - Network conditions
   - Any browser extensions enabled

---

## Next Steps

After successful manual testing:

1. ✅ Mark task 5 as complete
2. ✅ Proceed to task 6 (Documentation)
3. ✅ Consider deploying to staging environment
4. ✅ Monitor production logs after deployment
