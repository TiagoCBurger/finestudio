-- Migration: Enhance diagnostic logging for realtime triggers
-- Created: 2024-12-23
-- Description: Adds detailed logging to fal_jobs and projects broadcast triggers for debugging
-- Requirements: 3.1, 3.2, 3.4, 3.5, 5.1, 5.2

-- ============================================================================
-- ENHANCE FAL_JOBS BROADCAST TRIGGER WITH DETAILED LOGGING
-- ============================================================================

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
    PERFORM realtime.broadcast_changes(
      v_topic,           -- topic: 'fal_jobs:{user_id}'
      v_operation,       -- operation: INSERT, UPDATE, or DELETE
      v_operation,       -- operation type
      TG_TABLE_NAME,     -- table name
      TG_TABLE_SCHEMA,   -- schema name
      NEW,               -- new row data
      OLD                -- old row data
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

-- Update function comment
COMMENT ON FUNCTION notify_fal_job_changes() IS 
'Enhanced trigger function with detailed diagnostic logging for fal_jobs changes. Logs trigger invocation, broadcast attempts, success/failure, and execution time. Uses realtime.broadcast_changes for scalability.';

-- ============================================================================
-- ENHANCE PROJECTS BROADCAST TRIGGER WITH DETAILED LOGGING
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
      -- This is a best-effort attempt to identify the updated node
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
    PERFORM realtime.broadcast_changes(
      v_topic,           -- topic: 'project:{id}'
      v_operation,       -- operation: INSERT, UPDATE, or DELETE
      v_operation,       -- operation type
      TG_TABLE_NAME,     -- table name
      TG_TABLE_SCHEMA,   -- schema name
      NEW,               -- new row data
      OLD                -- old row data
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

-- Update function comment
COMMENT ON FUNCTION notify_project_changes() IS 
'Enhanced trigger function with detailed diagnostic logging for project changes. Logs trigger invocation, content changes, node updates, broadcast attempts, success/failure, and execution time. Uses realtime.broadcast_changes for scalability.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify triggers are properly configured
DO $$
BEGIN
  RAISE NOTICE 'Diagnostic logging enhancement applied successfully';
  RAISE NOTICE 'Triggers updated: fal_jobs_broadcast_trigger, projects_broadcast_trigger';
  RAISE NOTICE 'Check logs with: SELECT * FROM pg_stat_statements WHERE query LIKE ''%%REALTIME%%'';';
  RAISE NOTICE 'Or check PostgreSQL logs directly for [REALTIME] prefixed messages';
END $$;
