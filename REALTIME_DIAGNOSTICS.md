# Realtime Diagnostics Tool

This comprehensive diagnostic tool tests all components of the Supabase Realtime system to identify issues with multi-window synchronization.

## What It Tests

The diagnostic tool performs the following checks:

### 1. Environment Configuration
- Verifies Supabase URL and API keys are set
- Checks test user credentials are configured

### 2. Authentication
- Tests user login with credentials
- Verifies JWT token generation
- Tests `setAuth()` for realtime connections

### 3. Database Trigger
- Checks if `projects_broadcast_trigger` exists
- Verifies `notify_project_changes()` function exists
- Tests trigger functionality

### 4. RLS Policies
- Verifies access to `realtime.messages` table
- Checks project-related RLS policies
- Tests policy enforcement with actual user context

### 5. Test Project Setup
- Creates or uses existing test project
- Verifies project table access
- Ensures proper project ownership

### 6. Broadcast Flow Test
- Creates a private channel
- Subscribes to project updates
- Triggers a database update
- Verifies broadcast is received
- Measures broadcast latency

### 7. Multiple Channel Test
- Tests creating multiple channels simultaneously
- Verifies all channels can subscribe successfully

## Setup

### 1. Configure Test Credentials

Add these variables to your `.env` file:

```bash
# Required for diagnostics
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password
```

**Note:** Use a real user account that exists in your Supabase Auth system.

### 2. Ensure Supabase is Running

If using local Supabase:
```bash
npx supabase start
```

If using cloud Supabase, ensure your `.env` has the correct URL and keys.

## Running the Diagnostics

### Using npm script (recommended):
```bash
pnpm run diagnose:realtime
```

### Direct execution:
```bash
node test-realtime-diagnostics.js
```

## Understanding the Output

The tool provides color-coded output:

- ✅ **Green (Pass)**: Component is working correctly
- ❌ **Red (Fail)**: Component has a critical issue
- ⚠️ **Yellow (Warning)**: Component may have issues or couldn't be fully verified

### Example Output

```
============================================================
1. Environment Configuration
============================================================
✅ Environment: Supabase URL configured
✅ Environment: Supabase Anon Key configured
✅ Environment: Test credentials configured

============================================================
2. Authentication
============================================================
✅ Authentication: Successfully authenticated
✅ Authentication: Realtime auth token set

============================================================
6. Broadcast Flow Test
============================================================
✅ Broadcast Flow: Channel created
✅ Broadcast Flow: Successfully subscribed to channel
✅ Broadcast Flow: Project updated in database
✅ Broadcast Flow: Broadcast received!
   Details: {
     "latency": 234
   }
```

## Report File

After running, a detailed JSON report is saved to:
```
realtime-diagnostic-report.json
```

This report includes:
- Timestamp of the test run
- Summary statistics (passed/failed/warnings)
- Detailed results for each component
- Success rate percentage

### Report Structure

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "total": 15,
    "passed": 13,
    "failed": 1,
    "warnings": 1,
    "successRate": 86.7
  },
  "results": [
    {
      "component": "Authentication",
      "status": "pass",
      "message": "Successfully authenticated",
      "details": {
        "userId": "abc-123",
        "email": "test@example.com"
      },
      "timestamp": "2024-01-15T10:30:01.000Z"
    }
    // ... more results
  ]
}
```

## Troubleshooting

### "Cannot proceed without proper environment configuration"

**Solution:** Ensure these environment variables are set in your `.env`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

### "Login failed"

**Solution:** 
1. Verify the test user exists in Supabase Auth
2. Check the password is correct
3. Ensure the user's email is confirmed

### "No broadcast received within timeout"

This is the most common issue. Possible causes:

1. **Trigger not firing**
   - Check if trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'projects_broadcast_trigger'`
   - Verify trigger function exists and has no errors

2. **RLS policies blocking broadcasts**
   - Check policy on `realtime.messages` table
   - Verify user has access to the project
   - Test policy with: `SELECT * FROM realtime.messages WHERE topic LIKE 'project:%'`

3. **Authentication issue**
   - Ensure `setAuth()` is called before subscribing
   - Check JWT token is valid
   - Verify `private: true` is set on channel config

4. **Timing issue**
   - Increase timeout in the diagnostic script
   - Add delay between subscription and update

### "Could not verify trigger/policies (may need elevated permissions)"

**Solution:** This is a warning, not a failure. The diagnostic tool needs elevated database permissions to check some internal tables. The broadcast flow test is more important - if that passes, your system is working correctly.

## Integration with CI/CD

You can add this diagnostic to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Realtime Diagnostics
  run: pnpm run diagnose:realtime
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

The script exits with code 1 if any tests fail, which will fail the CI build.

## Next Steps

After running diagnostics:

1. **If all tests pass**: Your realtime system is configured correctly. The multi-window sync issue may be in the client-side code.

2. **If broadcast flow fails**: Focus on fixing the trigger and RLS policies (see tasks 2 and 3 in the implementation plan).

3. **If authentication fails**: Check your Supabase Auth configuration and user setup.

4. **If multiple warnings**: Consider running with elevated database permissions to get full verification.

## Related Files

- `test-realtime-diagnostics.js` - Main diagnostic script
- `realtime-diagnostic-report.json` - Generated report (gitignored)
- `.kiro/specs/multi-window-sync-fix/` - Full specification and implementation plan
