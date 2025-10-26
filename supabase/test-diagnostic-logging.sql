-- Test script for diagnostic logging migration
-- This script tests the enhanced logging in fal_jobs and projects triggers
-- Run this after applying the migration to verify logging is working

-- ============================================================================
-- SETUP: Check current trigger configuration
-- ============================================================================

\echo '=== Checking trigger configuration ==='

SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('fal_jobs', 'project')
  AND t.tgname LIKE '%broadcast%'
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- TEST 1: Test fal_jobs INSERT trigger
-- ============================================================================

\echo ''
\echo '=== TEST 1: Testing fal_jobs INSERT trigger ==='
\echo 'Expected logs:'
\echo '  - [REALTIME] fal_jobs trigger invoked'
\echo '  - [REALTIME] fal_jobs INSERT details'
\echo '  - [REALTIME] fal_jobs broadcast SUCCESS'
\echo '  - [REALTIME] fal_jobs trigger completed'
\echo ''

-- Get current user ID for testing
DO $$
DECLARE
  v_user_id uuid;
  v_test_job_id text;
BEGIN
  -- Get a valid user_id from the database
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found in database. Please create a user first.';
    RETURN;
  END IF;
  
  v_test_job_id := 'test-diagnostic-' || gen_random_uuid()::text;
  
  RAISE NOTICE 'Inserting test fal_job with id: %', v_test_job_id;
  
  -- Insert test job
  INSERT INTO fal_jobs (
    id, 
    request_id, 
    user_id, 
    model_id, 
    type, 
    status, 
    input
  ) VALUES (
    v_test_job_id,
    'test-request-' || gen_random_uuid()::text,
    v_user_id,
    'google/nano-banana',
    'image',
    'pending',
    '{"prompt": "test diagnostic logging"}'::jsonb
  );
  
  RAISE NOTICE 'Test job inserted successfully';
  RAISE NOTICE 'Check PostgreSQL logs for [REALTIME] messages';
  
  -- Store test job ID for cleanup
  PERFORM set_config('test.job_id', v_test_job_id, false);
END $$;

-- ============================================================================
-- TEST 2: Test fal_jobs UPDATE trigger
-- ============================================================================

\echo ''
\echo '=== TEST 2: Testing fal_jobs UPDATE trigger ==='
\echo 'Expected logs:'
\echo '  - [REALTIME] fal_jobs trigger invoked'
\echo '  - [REALTIME] fal_jobs UPDATE details (with old/new status)'
\echo '  - [REALTIME] fal_jobs broadcast SUCCESS'
\echo '  - [REALTIME] fal_jobs trigger completed'
\echo ''

DO $$
DECLARE
  v_test_job_id text;
BEGIN
  v_test_job_id := current_setting('test.job_id', true);
  
  IF v_test_job_id IS NULL THEN
    RAISE NOTICE 'No test job found. Skipping UPDATE test.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Updating test fal_job: %', v_test_job_id;
  
  -- Update test job
  UPDATE fal_jobs 
  SET 
    status = 'completed',
    completed_at = NOW(),
    output = '{"url": "https://example.com/test.jpg"}'::jsonb
  WHERE id = v_test_job_id;
  
  RAISE NOTICE 'Test job updated successfully';
  RAISE NOTICE 'Check PostgreSQL logs for [REALTIME] messages with status change details';
END $$;

-- ============================================================================
-- TEST 3: Test projects UPDATE trigger
-- ============================================================================

\echo ''
\echo '=== TEST 3: Testing projects UPDATE trigger ==='
\echo 'Expected logs:'
\echo '  - [REALTIME] projects trigger invoked'
\echo '  - [REALTIME] projects UPDATE details (with node count)'
\echo '  - [REALTIME] projects content changed (with size comparison)'
\echo '  - [REALTIME] projects broadcast SUCCESS'
\echo '  - [REALTIME] projects trigger completed'
\echo ''

DO $$
DECLARE
  v_user_id uuid;
  v_project_id text;
BEGIN
  -- Get a valid user_id from the database
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found in database. Please create a user first.';
    RETURN;
  END IF;
  
  -- Get or create a test project
  SELECT id INTO v_project_id 
  FROM project 
  WHERE user_id = v_user_id 
  LIMIT 1;
  
  IF v_project_id IS NULL THEN
    RAISE NOTICE 'No projects found for user. Creating test project.';
    
    v_project_id := 'test-project-' || gen_random_uuid()::text;
    
    INSERT INTO project (id, user_id, name, content)
    VALUES (
      v_project_id,
      v_user_id,
      'Test Diagnostic Project',
      '{"nodes": [{"id": "node1", "type": "image", "data": {}}]}'::jsonb
    );
  END IF;
  
  RAISE NOTICE 'Updating test project: %', v_project_id;
  
  -- Update project content
  UPDATE project
  SET 
    content = jsonb_set(
      content,
      '{nodes,0,data,generated}',
      '{"url": "https://example.com/test-diagnostic.jpg", "type": "image"}'::jsonb
    ),
    updated_at = NOW()
  WHERE id = v_project_id;
  
  RAISE NOTICE 'Test project updated successfully';
  RAISE NOTICE 'Check PostgreSQL logs for [REALTIME] messages with content change details';
  
  -- Store project ID for cleanup
  PERFORM set_config('test.project_id', v_project_id, false);
END $$;

-- ============================================================================
-- CLEANUP: Remove test data
-- ============================================================================

\echo ''
\echo '=== CLEANUP: Removing test data ==='

DO $$
DECLARE
  v_test_job_id text;
  v_test_project_id text;
BEGIN
  v_test_job_id := current_setting('test.job_id', true);
  v_test_project_id := current_setting('test.project_id', true);
  
  IF v_test_job_id IS NOT NULL THEN
    DELETE FROM fal_jobs WHERE id = v_test_job_id;
    RAISE NOTICE 'Deleted test fal_job: %', v_test_job_id;
  END IF;
  
  IF v_test_project_id IS NOT NULL AND v_test_project_id LIKE 'test-project-%' THEN
    DELETE FROM project WHERE id = v_test_project_id;
    RAISE NOTICE 'Deleted test project: %', v_test_project_id;
  END IF;
  
  RAISE NOTICE 'Cleanup completed';
END $$;

-- ============================================================================
-- VERIFICATION: Check function definitions
-- ============================================================================

\echo ''
\echo '=== Verifying enhanced function definitions ==='

-- Check if functions have the enhanced logging code
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%[REALTIME]%' THEN 'YES - Enhanced logging present'
    ELSE 'NO - Missing enhanced logging'
  END as has_enhanced_logging,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%v_broadcast_result%' THEN 'YES - Error handling present'
    ELSE 'NO - Missing error handling'
  END as has_error_handling
FROM pg_proc p
WHERE p.proname IN ('notify_fal_job_changes', 'notify_project_changes')
ORDER BY p.proname;

\echo ''
\echo '=== Test completed ==='
\echo 'To view the logs, check your PostgreSQL logs:'
\echo '  - Local: docker logs supabase_db_<project> 2>&1 | grep REALTIME'
\echo '  - Production: supabase logs postgres --filter "REALTIME"'
\echo '  - Dashboard: Project > Logs > Postgres Logs (filter by "REALTIME")'
