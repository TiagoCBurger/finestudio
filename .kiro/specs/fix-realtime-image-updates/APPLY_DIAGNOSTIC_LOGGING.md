# Applying Diagnostic Logging Migration

This guide explains how to apply the enhanced diagnostic logging migration to your database.

## Migration File

**File:** `supabase/migrations/20241223000001_enhance_diagnostic_logging.sql`

This migration enhances both `fal_jobs` and `projects` broadcast triggers with detailed diagnostic logging.

## What This Migration Does

### Enhanced fal_jobs Trigger Logging
- Logs trigger invocation with topic, operation, job_id, user_id, and timestamp
- Logs additional details for INSERT operations (status, model_id, type, request_id)
- Logs additional details for UPDATE operations (old/new status, completed_at changes)
- Wraps broadcast_changes in try-catch with detailed error logging
- Logs successful broadcasts with timestamp
- Logs failed broadcasts with error message, SQL state, detail, hint, and context
- Logs trigger execution duration in milliseconds

### Enhanced projects Trigger Logging
- Logs trigger invocation with topic, operation, project_id, and timestamp
- Logs additional details for UPDATE operations (node count, updated_at changes, content changes)
- Logs content size changes when project content is modified
- Logs node structure presence
- Wraps broadcast_changes in try-catch with detailed error logging
- Logs successful broadcasts with timestamp
- Logs failed broadcasts with error message, SQL state, detail, hint, and context
- Logs trigger execution duration in milliseconds

## Applying to Local Database

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're in the project root
cd /path/to/your/project

# Apply the migration to your local database
supabase db reset

# Or apply just this migration
supabase migration up
```

### Option 2: Using psql Directly

```bash
# Connect to your local Supabase database
psql postgresql://postgres:postgres@localhost:54322/postgres

# Run the migration
\i supabase/migrations/20241223000001_enhance_diagnostic_logging.sql

# Verify the functions were updated
\df notify_fal_job_changes
\df notify_project_changes

# Exit psql
\q
```

### Option 3: Using Supabase Studio

1. Open Supabase Studio: http://localhost:54323
2. Go to SQL Editor
3. Copy the contents of `supabase/migrations/20241223000001_enhance_diagnostic_logging.sql`
4. Paste and run the SQL

## Applying to Production

### Using Supabase Dashboard

1. Log in to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20241223000001_enhance_diagnostic_logging.sql`
4. Paste and execute the SQL
5. Verify the migration was successful

### Using Supabase CLI

```bash
# Link to your production project (if not already linked)
supabase link --project-ref your-project-ref

# Push the migration to production
supabase db push
```

## Verifying the Migration

### Check Trigger Functions Exist

```sql
-- Check fal_jobs trigger function
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
WHERE p.proname = 'notify_fal_job_changes';

-- Check projects trigger function
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
WHERE p.proname = 'notify_project_changes';
```

### Check Triggers Are Active

```sql
-- Check fal_jobs trigger
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'fal_jobs'
  AND t.tgname = 'fal_jobs_broadcast_trigger';

-- Check projects trigger
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'project'
  AND t.tgname = 'projects_broadcast_trigger';
```

## Testing the Logging

### Test fal_jobs Trigger

```sql
-- Insert a test job (replace with valid user_id)
INSERT INTO fal_jobs (
  id, 
  request_id, 
  user_id, 
  model_id, 
  type, 
  status, 
  input
) VALUES (
  'test-job-' || gen_random_uuid()::text,
  'test-request-' || gen_random_uuid()::text,
  'your-user-id-here',
  'google/nano-banana',
  'image',
  'pending',
  '{"prompt": "test image"}'::jsonb
);

-- Update the test job
UPDATE fal_jobs 
SET status = 'completed', completed_at = NOW()
WHERE id LIKE 'test-job-%'
ORDER BY created_at DESC
LIMIT 1;

-- Clean up test data
DELETE FROM fal_jobs WHERE id LIKE 'test-job-%';
```

### Test projects Trigger

```sql
-- Update a test project (replace with valid project_id)
UPDATE project
SET 
  content = jsonb_set(
    content,
    '{nodes,0,data,generated}',
    '{"url": "https://example.com/test.jpg", "type": "image"}'::jsonb
  ),
  updated_at = NOW()
WHERE id = 'your-project-id-here';
```

### View Logs

The logs will appear in your PostgreSQL logs. The location depends on your setup:

**Local Supabase:**
```bash
# View logs from Docker container
docker logs supabase_db_your-project 2>&1 | grep REALTIME

# Or check Supabase Studio logs
# Go to http://localhost:54323 > Logs > Postgres Logs
```

**Production Supabase:**
```bash
# View logs using Supabase CLI
supabase logs postgres --filter "REALTIME"

# Or check Supabase Dashboard
# Go to your project > Logs > Postgres Logs
# Filter by "REALTIME"
```

## Expected Log Output

### Successful fal_jobs INSERT:
```
[REALTIME] fal_jobs trigger invoked: topic=fal_jobs:user-123, operation=INSERT, job_id=job-456, user_id=user-123, timestamp=2024-12-23 10:30:00
[REALTIME] fal_jobs INSERT details: job_id=job-456, status=pending, model_id=google/nano-banana, type=image, request_id=req-789
[REALTIME] fal_jobs broadcast SUCCESS: topic=fal_jobs:user-123, operation=INSERT, job_id=job-456, timestamp=2024-12-23 10:30:00
[REALTIME] fal_jobs trigger completed: job_id=job-456, broadcast_result=t, duration_ms=15
```

### Successful projects UPDATE:
```
[REALTIME] projects trigger invoked: topic=project:proj-123, operation=UPDATE, project_id=proj-123, timestamp=2024-12-23 10:31:00
[REALTIME] projects UPDATE details: project_id=proj-123, node_count=5, old_updated_at=2024-12-23 10:30:00, new_updated_at=2024-12-23 10:31:00
[REALTIME] projects content changed: project_id=proj-123, content_size_old=1234, content_size_new=1456
[REALTIME] projects nodes structure present in NEW content
[REALTIME] projects broadcast SUCCESS: topic=project:proj-123, operation=UPDATE, project_id=proj-123, timestamp=2024-12-23 10:31:00
[REALTIME] projects trigger completed: project_id=proj-123, broadcast_result=t, duration_ms=22
```

### Failed Broadcast Example:
```
[REALTIME] fal_jobs trigger invoked: topic=fal_jobs:user-123, operation=UPDATE, job_id=job-456, user_id=user-123, timestamp=2024-12-23 10:32:00
WARNING: [REALTIME] fal_jobs broadcast FAILED: topic=fal_jobs:user-123, operation=UPDATE, job_id=job-456, error=function realtime.broadcast_changes does not exist, sqlstate=42883, detail=N/A, hint=No function matches the given name and argument types, context=SQL statement "SELECT realtime.broadcast_changes(...)"
[REALTIME] fal_jobs trigger completed: job_id=job-456, broadcast_result=f, duration_ms=8
```

## Troubleshooting

### Logs Not Appearing

1. **Check log level configuration:**
   ```sql
   SHOW log_min_messages;
   -- Should be 'log' or lower (debug5, debug4, debug3, debug2, debug1, info, notice, warning)
   ```

2. **Set log level if needed:**
   ```sql
   ALTER DATABASE postgres SET log_min_messages = 'log';
   -- Reconnect to database for changes to take effect
   ```

3. **Check if triggers are enabled:**
   ```sql
   SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE '%broadcast%';
   -- tgenabled should be 'O' (enabled)
   ```

### Broadcast Failures

If you see broadcast failures in the logs:

1. **Check if realtime extension is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'supabase_realtime';
   ```

2. **Check if realtime.broadcast_changes function exists:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'broadcast_changes' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'realtime');
   ```

3. **Check RLS policies on realtime.messages:**
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'realtime' AND tablename = 'messages';
   ```

## Rollback (If Needed)

If you need to rollback to the previous version:

```sql
-- Restore previous fal_jobs trigger function
-- (Copy from supabase/migrations/20241220000001_fix_realtime_broadcasts.sql)

-- Restore previous projects trigger function
-- (Copy from supabase/migrations/20241220000001_fix_realtime_broadcasts.sql)
```

## Next Steps

After applying this migration:

1. Generate a test image using KIE.ai to trigger the fal_jobs logging
2. Check the logs for `[REALTIME]` messages
3. Verify that broadcasts are being sent successfully
4. If broadcasts fail, investigate the error messages in the logs
5. Proceed to task 2 (client-side logging) to complete the diagnostic chain
