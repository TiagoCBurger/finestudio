# Multi-Window Sync Test

This test script validates that the Supabase Realtime multi-window synchronization is working correctly.

## What It Tests

The script simulates two browser windows open on the same project and verifies:

1. **Bidirectional Sync**: Changes made in Window A appear in Window B, and vice versa
2. **Latency**: Measures how long it takes for broadcasts to propagate
3. **Authentication**: Tests both public and private channel configurations
4. **Error Handling**: Provides detailed diagnostics when sync fails

## Prerequisites

- Node.js installed
- Supabase project configured
- Environment variables set in `.env`

## Configuration

### Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Optional Environment Variables

```bash
# For testing with authentication (private channels)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=your_test_password

# Specify a test project (defaults to a hardcoded ID)
TEST_PROJECT_ID=your-project-id

# Enable private channels (requires authentication)
USE_PRIVATE_CHANNELS=true
```

## Usage

### Basic Test (Public Channels)

```bash
node test-multi-window-sync.js
```

This runs the test with public channels (no authentication required).

### Test with Private Channels

1. Set up test credentials in `.env`:
   ```bash
   TEST_USER_EMAIL=your-test-user@example.com
   TEST_USER_PASSWORD=your-password
   USE_PRIVATE_CHANNELS=true
   ```

2. Run the test:
   ```bash
   node test-multi-window-sync.js
   ```

### Test with Custom Project

```bash
TEST_PROJECT_ID=your-project-id node test-multi-window-sync.js
```

## Understanding the Output

### Test Steps

The test runs through these steps:

1. **Authentication** (if using private channels)
   - Authenticates both simulated windows
   - Sets auth tokens for Realtime

2. **Channel Setup**
   - Configures broadcast listeners on both windows
   - Sets up event handlers

3. **Subscription**
   - Subscribes both windows to the project channel
   - Waits for SUBSCRIBED status

4. **Project Fetch**
   - Retrieves current project data
   - Validates project exists

5. **Sync A→B Test**
   - Window 1 updates the project
   - Measures time for Window 2 to receive broadcast
   - Reports latency

6. **Sync B→A Test**
   - Window 2 updates the project
   - Measures time for Window 1 to receive broadcast
   - Reports latency

7. **Cleanup**
   - Removes test nodes
   - Unsubscribes channels

### Success Criteria

The test passes if:
- ✅ Both windows successfully subscribe
- ✅ Window 2 receives updates from Window 1
- ✅ Window 1 receives updates from Window 2
- ✅ Latency is under 5 seconds (ideally < 1 second)

### Example Success Output

```
======================================================================
📋 Multi-Window Sync Test Summary
======================================================================

📊 Test Steps:
  • Total: 7
  • Passed: 7 ✅
  • Failed: 0 ❌
  • Warnings: 0 ⚠️

⏱️  Timing Breakdown:
  • Authentication: 450ms
  • Subscription: 1200ms
  • Sync A To B Latency: 320ms
  • Sync B To A Latency: 285ms
  • Total: 8500ms

======================================================================
Overall Status: ✅ PASSED
======================================================================

🎉 Multi-window sync is working correctly!
   Changes in one window are automatically reflected in the other.
   Average sync latency: 303ms
   ⚡ Excellent performance!
```

## Troubleshooting

### Test Fails: "Window 2 did NOT receive the update"

**Possible causes:**

1. **Database trigger not working**
   - Check if `projects_broadcast_trigger` exists
   - Verify trigger function `notify_project_changes()` is correct
   - Run: `SELECT * FROM pg_trigger WHERE tgname = 'projects_broadcast_trigger';`

2. **RLS policies blocking broadcast**
   - Check policies on `realtime.messages` table
   - Verify `users_can_receive_project_broadcasts` policy exists
   - Test policy: `SELECT * FROM realtime.messages WHERE topic LIKE 'project:%';`

3. **Channel configuration incorrect**
   - Ensure channel name matches: `project:${projectId}`
   - Verify event name is `project_updated`
   - Check if `private: true` requires authentication

### Test Fails: "Authentication failed"

**Solutions:**

1. Verify credentials in `.env`:
   ```bash
   TEST_USER_EMAIL=valid-email@example.com
   TEST_USER_PASSWORD=correct-password
   ```

2. Ensure user exists in Supabase Auth:
   - Go to Supabase Dashboard > Authentication > Users
   - Create test user if needed

3. Check if email is confirmed:
   - Unconfirmed emails may not authenticate
   - Manually confirm in dashboard if needed

### Test Fails: "Subscription timed out"

**Solutions:**

1. Check Supabase Realtime is enabled:
   - Dashboard > Project Settings > API
   - Ensure Realtime is enabled

2. Verify network connectivity:
   - Check firewall settings
   - Ensure WebSocket connections are allowed

3. Check Realtime logs:
   - Dashboard > Logs > Realtime
   - Look for connection errors

### High Latency (> 1 second)

**Possible causes:**

1. **Network latency**
   - Test from different network
   - Check internet connection speed

2. **Database performance**
   - Check if database is under load
   - Verify indexes exist on `project` table

3. **Trigger performance**
   - Simplify trigger function if complex
   - Remove unnecessary operations

## Integration with CI/CD

To run this test in CI/CD pipelines:

```yaml
# .github/workflows/test.yml
- name: Test Multi-Window Sync
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
    USE_PRIVATE_CHANNELS: true
  run: node test-multi-window-sync.js
```

## Related Files

- `test-realtime-diagnostics.js` - Comprehensive Realtime diagnostics
- `test-enhanced-trigger.js` - Database trigger testing
- `test-rls-optimization.js` - RLS policy testing
- `.kiro/specs/multi-window-sync-fix/` - Feature specification

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the spec documents in `.kiro/specs/multi-window-sync-fix/`
3. Check Supabase Realtime documentation
4. Review application logs and Supabase dashboard logs
