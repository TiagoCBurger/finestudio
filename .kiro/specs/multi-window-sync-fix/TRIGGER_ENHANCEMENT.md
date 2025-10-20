# Project Broadcast Trigger Enhancement

## Overview

This document describes the enhancement made to the `notify_project_changes()` trigger function to improve reliability, debuggability, and maintainability of the multi-window sync feature.

## Changes Made

### 1. Added Explicit Error Handling

**Before:**
```sql
BEGIN
  PERFORM realtime.broadcast_changes(...);
  RETURN COALESCE(NEW, OLD);
END;
```

**After:**
```sql
BEGIN
  BEGIN
    PERFORM realtime.broadcast_changes(...);
    RAISE LOG 'Successfully broadcasted to topic: %', v_topic;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to broadcast: %', SQLERRM;
  END;
  RETURN COALESCE(NEW, OLD);
END;
```

**Benefits:**
- Database operations won't fail if realtime broadcast fails
- Errors are logged for debugging
- System is more resilient to realtime service issues

### 2. Added Logging for Debugging

Added two log statements:
- `RAISE LOG` before broadcast attempt (logs topic, operation, project_id)
- `RAISE LOG` after successful broadcast
- `RAISE WARNING` on error (logs topic, error message, SQL state)

**Benefits:**
- Easy to trace broadcast attempts in Supabase logs
- Can verify trigger is firing correctly
- Can diagnose issues with specific projects

### 3. Removed Unnecessary Type Casts

**Before:**
```sql
'project:' || COALESCE(NEW.id, OLD.id)::text
```

**After:**
```sql
'project:' || v_project_id  -- id is already text type
```

**Benefits:**
- Cleaner code
- Slightly better performance
- Avoids potential type conversion issues

### 4. Added Variables for Better Readability

**Before:**
```sql
PERFORM realtime.broadcast_changes(
  'project:' || COALESCE(NEW.id, OLD.id)::text,
  TG_OP,
  'project_updated',
  ...
);
```

**After:**
```sql
DECLARE
  v_project_id text;
  v_topic text;
  v_operation text;
BEGIN
  v_project_id := COALESCE(NEW.id, OLD.id);
  v_topic := 'project:' || v_project_id;
  v_operation := TG_OP;
  
  PERFORM realtime.broadcast_changes(
    v_topic,
    v_operation,
    'project_updated',
    ...
  );
END;
```

**Benefits:**
- More readable code
- Easier to debug (can see variable values in logs)
- Easier to maintain and modify

## Migration File

**Location:** `supabase/migrations/20241218000001_enhance_project_broadcast_trigger.sql`

**What it does:**
1. Drops existing trigger
2. Creates enhanced function with error handling
3. Recreates trigger on project table
4. Updates function comment

## Testing

### Automated Testing

Run the test script:
```bash
node test-enhanced-trigger.js
```

This will:
- Check if trigger exists
- Verify function has error handling, logging, and variables
- Test trigger by updating a project
- Provide next steps for verification

### Manual Testing in Supabase

1. Open Supabase SQL Editor
2. Run the verification script: `verify-trigger-enhancement.sql`
3. Check the results:
   - Trigger should exist
   - Function should have error handling, logging, and variables
   - Function should use `realtime.broadcast_changes`

### Verify Trigger Fires

1. Update a project in the database:
   ```sql
   UPDATE project 
   SET content = jsonb_set(content, '{test}', 'true'::jsonb)
   WHERE id = 'your-project-id';
   ```

2. Check Supabase logs (Dashboard > Logs > Postgres Logs):
   - Look for: `Broadcasting project change: topic=project:xxx`
   - Look for: `Successfully broadcasted to topic: project:xxx`
   - If errors: Look for: `Failed to broadcast project changes`

### Multi-Window Sync Test

After verifying the trigger fires, test multi-window sync:
```bash
node test-multi-window-sync.js
```

## Rollback

If needed, you can rollback to the previous version:

```sql
-- Restore previous function (using realtime.send)
CREATE OR REPLACE FUNCTION notify_project_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'id', COALESCE(NEW.id, OLD.id),
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'timestamp', NOW()
    ),
    'project_updated',
    'project:' || COALESCE(NEW.id, OLD.id)::text,
    false
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

## Requirements Addressed

This enhancement addresses the following requirements from the spec:

- **Requirement 2.1:** Error handling ensures broadcasts don't block database operations
- **Requirement 2.2:** Logging enables debugging of sync issues
- **Requirement 2.3:** Variables improve code readability
- **Requirement 2.4:** Removed unnecessary type casts for cleaner code

## Next Steps

1. ✅ Apply migration to database
2. ✅ Verify trigger fires correctly
3. ⏭️ Test multi-window sync
4. ⏭️ Monitor logs for any errors
5. ⏭️ Proceed to task 3: Optimize RLS policies
