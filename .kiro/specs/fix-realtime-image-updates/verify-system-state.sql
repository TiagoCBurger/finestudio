-- System State Verification Script
-- Run this before starting tests to ensure everything is configured correctly

-- ============================================================================
-- 1. VERIFY TRIGGERS EXIST
-- ============================================================================
SELECT 
  '=== TRIGGERS ===' as section,
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name,
  tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE '%broadcast%'
ORDER BY tgname;

-- Expected Results:
-- fal_jobs_broadcast_trigger on fal_jobs table
-- projects_broadcast_trigger on project table

-- ============================================================================
-- 2. VERIFY RLS POLICIES ON REALTIME.MESSAGES
-- ============================================================================
SELECT 
  '=== REALTIME.MESSAGES POLICIES ===' as section,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'realtime' 
  AND tablename = 'messages'
ORDER BY policyname;

-- Expected: Policies for SELECT and INSERT operations

-- ============================================================================
-- 3. VERIFY INDEXES FOR RLS PERFORMANCE
-- ============================================================================
SELECT 
  '=== INDEXES ===' as section,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname IN ('public', 'realtime')
  AND (
    tablename = 'fal_jobs' 
    OR tablename = 'project'
    OR tablename = 'messages'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- 4. CHECK RECENT FAL_JOBS
-- ============================================================================
SELECT 
  '=== RECENT FAL_JOBS ===' as section,
  id,
  request_id,
  user_id,
  model_id,
  status,
  created_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - created_at)) as duration_seconds
FROM fal_jobs
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 5. CHECK FOR ORPHANED JOBS (STUCK IN PENDING)
-- ============================================================================
SELECT 
  '=== ORPHANED JOBS ===' as section,
  id,
  request_id,
  model_id,
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
FROM fal_jobs
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- Expected: Empty result (no stuck jobs)

-- ============================================================================
-- 6. CHECK RECENT PROJECT UPDATES
-- ============================================================================
SELECT 
  '=== RECENT PROJECT UPDATES ===' as section,
  id,
  user_id,
  updated_at,
  jsonb_array_length(content->'nodes') as node_count,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(content->'nodes') as node
    WHERE node->'data'->'generated'->>'url' IS NOT NULL
  ) as nodes_with_images
FROM project
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================================
-- 7. VERIFY REALTIME SCHEMA EXISTS
-- ============================================================================
SELECT 
  '=== REALTIME SCHEMA ===' as section,
  schema_name
FROM information_schema.schemata
WHERE schema_name = 'realtime';

-- Expected: One row with 'realtime'

-- ============================================================================
-- 8. CHECK REALTIME FUNCTIONS
-- ============================================================================
SELECT 
  '=== REALTIME FUNCTIONS ===' as section,
  proname as function_name,
  pronargs as arg_count,
  prorettype::regtype as return_type
FROM pg_proc
WHERE pronamespace = 'realtime'::regnamespace
  AND proname IN ('broadcast_changes', 'send')
ORDER BY proname;

-- Expected: broadcast_changes and send functions

-- ============================================================================
-- 9. CHECK TABLE PERMISSIONS
-- ============================================================================
SELECT 
  '=== TABLE PERMISSIONS ===' as section,
  schemaname,
  tablename,
  tableowner,
  hasinserts,
  hasupdates,
  hasdeletes,
  hasselects
FROM pg_tables
WHERE schemaname IN ('public', 'realtime')
  AND tablename IN ('fal_jobs', 'project', 'messages')
ORDER BY schemaname, tablename;

-- ============================================================================
-- 10. VERIFY TRIGGER FUNCTIONS EXIST
-- ============================================================================
SELECT 
  '=== TRIGGER FUNCTIONS ===' as section,
  proname as function_name,
  prosrc as function_body_preview
FROM pg_proc
WHERE proname LIKE '%broadcast_trigger%'
ORDER BY proname;

-- Expected: fal_jobs_broadcast_trigger and projects_broadcast_trigger functions

-- ============================================================================
-- 11. CHECK FOR RECENT ERRORS IN LOGS (if accessible)
-- ============================================================================
-- Note: This may not work in all environments
-- Check Supabase dashboard logs instead if this fails

-- ============================================================================
-- SUMMARY CHECKLIST
-- ============================================================================
-- Run this script and verify:
-- [ ] Both broadcast triggers exist and are enabled
-- [ ] RLS policies exist on realtime.messages for SELECT and INSERT
-- [ ] No orphaned jobs stuck in pending status
-- [ ] Recent projects have been updated
-- [ ] Realtime schema and functions exist
-- [ ] Trigger functions contain logging code

-- If any checks fail, review the migration files and apply missing migrations
