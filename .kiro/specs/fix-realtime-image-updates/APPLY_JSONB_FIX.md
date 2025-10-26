# Apply JSONB COALESCE Fix

## Issue
Database error when saving projects:
```
COALESCE could not convert type jsonb to json
where: 'PL/pgSQL function notify_project_changes() line 24 at assignment'
```

## Root Cause
The `notify_project_changes()` trigger function was using `'[]'::jsonb` in a COALESCE statement, causing PostgreSQL type coercion errors.

## Solution
Apply the migration that fixes the JSONB type coercion issue.

## Steps to Apply

### Option 1: Using Supabase CLI (Recommended)
```bash
# Apply the specific migration
supabase db push

# Or apply just this migration
supabase migration up --version 20241224000002
```

### Option 2: Using Supabase Dashboard
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20241224000002_fix_jsonb_coalesce_error.sql`
4. Click "Run"

### Option 3: Direct SQL Execution
```bash
# If using local Supabase
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20241224000002_fix_jsonb_coalesce_error.sql

# If using remote Supabase (get connection string from dashboard)
psql "postgresql://..." -f supabase/migrations/20241224000002_fix_jsonb_coalesce_error.sql
```

## Verification

### 1. Check Function Was Updated
Run this query in Supabase SQL Editor:

```sql
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'notify_project_changes';
```

**Expected**: The function definition should NOT contain `'[]'::jsonb`

### 2. Test Project Save
1. Open your application
2. Make a change to a project (move a node, edit text, etc.)
3. Wait for auto-save
4. **Expected**: No "Database operation failed" error
5. **Expected**: Changes are saved successfully

### 3. Check Logs
In Supabase Dashboard → Logs → Postgres Logs:

**Before Fix**:
```
ERROR: COALESCE could not convert type jsonb to json
```

**After Fix**:
```
[REALTIME] projects trigger invoked: topic=project:..., operation=UPDATE
[REALTIME] projects UPDATE details: project_id=..., node_count=...
[REALTIME] projects broadcast SUCCESS: topic=project:...
```

## What Changed

### Issue 1: JSONB COALESCE Error
**Before (Broken)**:
```sql
v_node_count := jsonb_array_length(COALESCE(NEW.content->'nodes', '[]'::jsonb));
```

**After (Fixed)**:
```sql
BEGIN
  v_node_count := jsonb_array_length((NEW.content::jsonb)->'nodes');
EXCEPTION WHEN OTHERS THEN
  v_node_count := 0;
  RAISE LOG '[REALTIME] Could not count nodes, defaulting to 0: %', SQLERRM;
END;
```

### Issue 2: JSON Comparison Error
**Before (Broken)**:
```sql
IF OLD.content IS DISTINCT FROM NEW.content THEN
```

**After (Fixed)**:
```sql
IF OLD.content::text IS DISTINCT FROM NEW.content::text THEN
```

**Reason**: The `content` column is `json` type (not `jsonb`), and PostgreSQL doesn't have a built-in equality operator for `json` type. We cast to `text` for comparison.

## Benefits of the Fix

1. **Eliminates Type Coercion Error**: No more JSONB/JSON conversion issues
2. **Graceful Error Handling**: If counting fails, defaults to 0 instead of crashing
3. **Better Logging**: Logs when node counting fails for debugging
4. **Maintains Functionality**: All diagnostic logging features preserved

## Rollback (If Needed)

If you need to rollback this change:

```sql
-- Restore previous version (with the bug)
-- NOT RECOMMENDED - only use if absolutely necessary
-- Better to fix any new issues that arise from the fix
```

## Related Files

- **Migration**: `supabase/migrations/20241224000002_fix_jsonb_coalesce_error.sql`
- **Previous Migration**: `supabase/migrations/20241223000001_enhance_diagnostic_logging.sql`
- **Documentation**: `HOTFIX_MAP_AND_DB_ERRORS.md`

## Troubleshooting

### Issue: Migration fails to apply
**Solution**: Check if you have the previous migrations applied first. Run:
```sql
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;
```

### Issue: Still seeing the error after applying
**Solution**: 
1. Verify the function was actually updated (see Verification step 1)
2. Restart your application
3. Clear browser cache
4. Check Supabase logs for any other errors

### Issue: Different error appears
**Solution**: Check the new error message and logs. The fix might have revealed a different underlying issue that needs addressing.

## Success Criteria

✅ Migration applied successfully  
✅ Function definition updated (no `'[]'::jsonb`)  
✅ Projects can be saved without errors  
✅ Realtime updates still working  
✅ Logs show successful broadcasts  

## Next Steps

After applying this fix:
1. Test project saving thoroughly
2. Test image generation (which triggers project updates)
3. Test multi-tab synchronization
4. Monitor logs for any new issues
5. Proceed with comprehensive testing (Task 11)
