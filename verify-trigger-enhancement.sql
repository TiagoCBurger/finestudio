-- Verification script for enhanced project broadcast trigger
-- Run this in Supabase SQL Editor to verify the migration

-- 1. Check if trigger exists
SELECT 
  t.tgname AS trigger_name,
  p.proname AS function_name,
  c.relname AS table_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'project'
  AND t.tgname = 'projects_broadcast_trigger';

-- 2. Check function definition
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
WHERE p.proname = 'notify_project_changes';

-- 3. Verify function has key improvements
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) LIKE '%EXCEPTION WHEN OTHERS%' AS has_error_handling,
  pg_get_functiondef(p.oid) LIKE '%RAISE LOG%' AS has_logging,
  pg_get_functiondef(p.oid) LIKE '%DECLARE%' AS has_variables,
  pg_get_functiondef(p.oid) LIKE '%realtime.broadcast_changes%' AS uses_broadcast_changes,
  pg_get_functiondef(p.oid) LIKE '%realtime.send%' AS uses_realtime_send
FROM pg_proc p
WHERE p.proname = 'notify_project_changes';

-- 4. Test the trigger (optional - uncomment to test)
-- This will update a project and trigger the broadcast
-- Check logs after running this to see the RAISE LOG messages
/*
UPDATE project 
SET content = jsonb_set(
  COALESCE(content, '{}'::jsonb),
  '{test_timestamp}',
  to_jsonb(NOW()::text)
)
WHERE id = (SELECT id FROM project LIMIT 1)
RETURNING id, name;
*/

-- 5. Check recent logs (if log_statement is enabled)
-- Note: This may not work depending on your Supabase plan
-- Use Supabase Dashboard > Logs instead
