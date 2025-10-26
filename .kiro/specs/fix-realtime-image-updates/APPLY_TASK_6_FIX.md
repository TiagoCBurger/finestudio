# Quick Guide: Apply Task 6 Database Trigger Fix

## What Was Fixed

Added explicit `level` parameter to `realtime.broadcast_changes()` calls in both database triggers to ensure proper function invocation and follow Supabase best practices.

## Apply the Fix

### Option 1: Reset Database (Recommended for Local)

```bash
# This will apply all migrations including the new one
supabase db reset
```

### Option 2: Apply Single Migration

```bash
# Local PostgreSQL
psql -h localhost -U postgres -d postgres -f supabase/migrations/20241224000001_fix_broadcast_triggers_parameters.sql

# Or using Supabase CLI
supabase db push
```

### Option 3: Via Supabase Dashboard

1. Go to **Database** > **Migrations**
2. Click **New Migration**
3. Copy content from `supabase/migrations/20241224000001_fix_broadcast_triggers_parameters.sql`
4. Run the migration

## Verify the Fix

```sql
-- Check if functions have the explicit level parameter
SELECT 
  p.proname,
  pg_get_functiondef(p.oid) LIKE '%''ROW''%' as has_explicit_level
FROM pg_proc p
WHERE p.proname IN ('notify_fal_job_changes', 'notify_project_changes');

-- Expected result:
-- notify_fal_job_changes    | t
-- notify_project_changes     | t
```

## Test the Fix

1. **Generate an image** using KIE.ai model (`google/nano-banana`)
2. **Check database logs** for:
   - `[REALTIME] fal_jobs broadcast SUCCESS`
   - `[REALTIME] projects broadcast SUCCESS`
3. **Check browser console** for:
   - `[REALTIME-DIAGNOSTIC] QueueMonitor broadcast received`
   - `[REALTIME-DIAGNOSTIC] ProjectRealtime broadcast received`
4. **Verify UI updates** without page refresh

## What's Next

- If broadcasts now work: ✅ Issue resolved!
- If broadcasts still fail: Continue with Task 5 testing to identify the actual root cause

## Files Created

- `supabase/migrations/20241224000001_fix_broadcast_triggers_parameters.sql` - Migration file
- `.kiro/specs/fix-realtime-image-updates/TASK_6_FIX_APPLIED.md` - Detailed documentation

## Need Help?

See `TASK_6_FIX_APPLIED.md` for:
- Detailed explanation of the fix
- Complete testing procedures
- Troubleshooting steps
- Verification queries
