-- Migration: Fix broadcast triggers to use correct parameters
-- Created: 2024-12-24
-- Description: Fixes the realtime.broadcast_changes calls to use explicit level parameter
-- Based on: Supabase realtime best practices and function signature analysis
-- Requirements: 3.1, 3.2, 3.3, 3.4, 5.6

-- ============================================================================
-- FIX FAL_JOBS BROADCAST TRIGGER
-- ============================================================================
-- Issue: The trigger was not explicitly passing the level parameter
-- Fix: Add explicit 'ROW' parameter to ensure proper function call

CREATE OR REPLACE FUNCTION notify_fal_job_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id text;
  v_topic text;
  v_operation text;
  v_job_id text;
  v_timestamp timestamptz;
  v_broadcast_result boolean;
BEGIN
  -- Extract variables for logging
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  v_topic := 'fal_jobs:' || v_user_id;
  v_operation := TG_OP;
  v_job_id := COALESCE(NEW.id, OLD.id);
  v_timestamp := NOW();
  
  -- Log trigger invocation with all relevant details
  RAISE LOG '[REALTIME] fal_jobs trigger invoked: topic=%, operation=%, job_id=%, user_id=%, timestamp=%',
    v_topic, v_operation, v_job_id, v_user_id, v_timestamp;
  
  -- Log additional context for UPDATE operations
  IF v_operation = 'UPDATE' THEN
    RAISE LOG '[REALTIME] fal_jobs UPDATE details: job_id=%, old_status=%, new_status=%, old_completed_at=%, new_completed_at=%',
      v_job_id, 
      OLD.status, 
      NEW.status,
      OLD.completed_at,
      NEW.completed_at;
  END IF;
  
  -- Log additional context for INSERT operations
  IF v_operation = 'INSERT' THEN
    RAISE LOG '[REALTIME] fal_jobs INSERT details: job_id=%, status=%, model_id=%, type=%, request_id=%',
      v_job_id,
      NEW.status,
      NEW.model_id,
      NEW.type,
      NEW.request_id;
  END IF;
  
  -- Attempt broadcast with try-catch for detailed error logging
  BEGIN
    -- Call realtime.broadcast_changes with correct parameters
    -- Parameters: topic_name, event_name, operation, table_name, table_schema, new, old, level (optional)
    PERFORM realtime.broadcast_changes(
      v_topic,           -- topic_name: 'fal_jobs:{user_id}'
      v_operation,       -- event_name: 'INSERT', 'UPDATE', or 'DELETE'
      v_operation,       -- operation: 'INSERT', 'UPDATE', or 'DELETE'
      TG_TABLE_NAME,     -- table_name: 'fal_jobs'
      TG_TABLE_SCHEMA,   -- table_schema: 'public'
      NEW,               -- new: new row data (NULL for DELETE)
      OLD,               -- old: old row data (NULL for INSERT)
      'ROW'              -- level: 'ROW' (explicit, though it's the default)
    );
    
    v_broadcast_result := true;
    
    -- Log successful broadcast with details
    RAISE LOG '[REALTIME] fal_jobs broadcast SUCCESS: topic=%, operation=%, job_id=%, timestamp=%',
      v_topic, v_operation, v_job_id, NOW();
    
  EXCEPTION WHEN OTHERS THEN
    v_broadcast_result := false;
    
    -- Log detailed error information
    RAISE WARNING '[REALTIME] fal_jobs broadcast FAILED: topic=%, operation=%, job_id=%, error=%, sqlstate=%, detail=%, hint=%, context=%',
      v_topic, 
      v_operation, 
      v_job_id, 
      SQLERRM,           -- Error message
      SQLSTATE,          -- SQL state code
      COALESCE(PG_EXCEPTION_DETAIL, 'N/A'),    -- Additional detail
      COALESCE(PG_EXCEPTION_HINT, 'N/A'),      -- Hint for fixing
      COALESCE(PG_EXCEPTION_CONTEXT, 'N/A');   -- Context where error occurred
    
    -- Continue with the operation even if broadcast fails
    -- This ensures database operations aren't blocked by realtime issues
  END;
  
  -- Log completion of trigger execution
  RAISE LOG '[REALTIME] fal_jobs trigger completed: job_id=%, broadcast_result=%, duration_ms=%',
    v_job_id, 
    v_broadcast_result,
    EXTRACT(MILLISECONDS FROM (NOW() - v_timestamp));
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION notify_fal_job_changes() IS 
'Fixed trigger function with correct realtime.broadcast_changes parameters. Uses explicit level parameter and proper event naming. Includes comprehensive diagnostic logging.';

-- ============================================================================
-- FIX PROJECTS BROADCAST TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_project_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id text;
  v_topic text;
  v_operation text;
  v_timestamp timestamptz;
  v_broadcast_result boolean;
  v_updated_node_id text;
  v_node_count int;
BEGIN
  -- Extract variables for logging
  v_project_id := COALESCE(NEW.id, OLD.id);
  v_topic := 'project:' || v_project_id;
  v_operation := TG_OP;
  v_timestamp := NOW();
  
  -- Log trigger invocation with all relevant details
  RAISE LOG '[REALTIME] projects trigger invoked: topic=%, operation=%, project_id=%, timestamp=%',
    v_topic, v_operation, v_project_id, v_timestamp;
  
  -- Log additional context for UPDATE operations
  IF v_operation = 'UPDATE' THEN
    -- Count nodes in project
    v_node_count := jsonb_array_length(COALESCE(NEW.content->'nodes', '[]'::jsonb));
    
    RAISE LOG '[REALTIME] projects UPDATE details: project_id=%, node_count=%, old_updated_at=%, new_updated_at=%',
      v_project_id,
      v_node_count,
      OLD.updated_at,
      NEW.updated_at;
    
    -- Try to identify which node was updated (if content changed)
    IF OLD.content IS DISTINCT FROM NEW.content THEN
      RAISE LOG '[REALTIME] projects content changed: project_id=%, content_size_old=%, content_size_new=%',
        v_project_id,
        length(OLD.content::text),
        length(NEW.content::text);
      
      -- Log if we can identify a specific node update (simplified check)
      IF NEW.content ? 'nodes' THEN
        RAISE LOG '[REALTIME] projects nodes structure present in NEW content';
      END IF;
    END IF;
  END IF;
  
  -- Log additional context for INSERT operations
  IF v_operation = 'INSERT' THEN
    v_node_count := jsonb_array_length(COALESCE(NEW.content->'nodes', '[]'::jsonb));
    RAISE LOG '[REALTIME] projects INSERT details: project_id=%, node_count=%, user_id=%',
      v_project_id,
      v_node_count,
      NEW.user_id;
  END IF;
  
  -- Attempt broadcast with try-catch for detailed error logging
  BEGIN
    -- Call realtime.broadcast_changes with correct parameters
    -- Parameters: topic_name, event_name, operation, table_name, table_schema, new, old, level (optional)
    PERFORM realtime.broadcast_changes(
      v_topic,           -- topic_name: 'project:{id}'
      v_operation,       -- event_name: 'INSERT', 'UPDATE', or 'DELETE'
      v_operation,       -- operation: 'INSERT', 'UPDATE', or 'DELETE'
      TG_TABLE_NAME,     -- table_name: 'project'
      TG_TABLE_SCHEMA,   -- table_schema: 'public'
      NEW,               -- new: new row data (NULL for DELETE)
      OLD,               -- old: old row data (NULL for INSERT)
      'ROW'              -- level: 'ROW' (explicit, though it's the default)
    );
    
    v_broadcast_result := true;
    
    -- Log successful broadcast with details
    RAISE LOG '[REALTIME] projects broadcast SUCCESS: topic=%, operation=%, project_id=%, timestamp=%',
      v_topic, v_operation, v_project_id, NOW();
    
  EXCEPTION WHEN OTHERS THEN
    v_broadcast_result := false;
    
    -- Log detailed error information
    RAISE WARNING '[REALTIME] projects broadcast FAILED: topic=%, operation=%, project_id=%, error=%, sqlstate=%, detail=%, hint=%, context=%',
      v_topic, 
      v_operation, 
      v_project_id, 
      SQLERRM,           -- Error message
      SQLSTATE,          -- SQL state code
      COALESCE(PG_EXCEPTION_DETAIL, 'N/A'),    -- Additional detail
      COALESCE(PG_EXCEPTION_HINT, 'N/A'),      -- Hint for fixing
      COALESCE(PG_EXCEPTION_CONTEXT, 'N/A');   -- Context where error occurred
    
    -- Continue with the operation even if broadcast fails
  END;
  
  -- Log completion of trigger execution
  RAISE LOG '[REALTIME] projects trigger completed: project_id=%, broadcast_result=%, duration_ms=%',
    v_project_id, 
    v_broadcast_result,
    EXTRACT(MILLISECONDS FROM (NOW() - v_timestamp));
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION notify_project_changes() IS 
'Fixed trigger function with correct realtime.broadcast_changes parameters. Uses explicit level parameter and proper event naming. Includes comprehensive diagnostic logging.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Broadcast trigger fixes applied successfully';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Added explicit level parameter (ROW) to broadcast_changes calls';
  RAISE NOTICE '  - Maintained all diagnostic logging';
  RAISE NOTICE '  - Ensured proper parameter order and types';
  RAISE NOTICE '';
  RAISE NOTICE 'Test the triggers by:';
  RAISE NOTICE '  1. Generating an image with KIE.ai';
  RAISE NOTICE '  2. Checking database logs for [REALTIME] messages';
  RAISE NOTICE '  3. Verifying broadcasts are received in browser console';
END $$;
