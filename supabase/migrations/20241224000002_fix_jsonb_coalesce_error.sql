-- Migration: Fix JSONB COALESCE type conversion error
-- Created: 2024-12-24
-- Description: Fixes "COALESCE could not convert type jsonb to json" error in notify_project_changes function
-- Issue: Line 24 was using '[]'::jsonb which causes type coercion issues in some PostgreSQL versions
-- Solution: Use NULL as fallback instead of empty array, or use proper json type

-- ============================================================================
-- FIX PROJECTS BROADCAST TRIGGER - JSONB COALESCE ERROR
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
    -- FIX: Cast json to jsonb for jsonb_array_length function
    BEGIN
      v_node_count := jsonb_array_length((NEW.content::jsonb)->'nodes');
    EXCEPTION WHEN OTHERS THEN
      v_node_count := 0;
      RAISE LOG '[REALTIME] Could not count nodes, defaulting to 0: %', SQLERRM;
    END;
    
    RAISE LOG '[REALTIME] projects UPDATE details: project_id=%, node_count=%, old_updated_at=%, new_updated_at=%',
      v_project_id,
      COALESCE(v_node_count, 0),
      OLD.updated_at,
      NEW.updated_at;
    
    -- Try to identify which node was updated (if content changed)
    -- FIX: Cast to text for comparison since json type doesn't support = operator
    IF OLD.content::text IS DISTINCT FROM NEW.content::text THEN
      RAISE LOG '[REALTIME] projects content changed: project_id=%, content_size_old=%, content_size_new=%',
        v_project_id,
        length(OLD.content::text),
        length(NEW.content::text);
      
      -- Log if we can identify a specific node update (simplified check)
      -- This is a best-effort attempt to identify the updated node
      -- FIX: Cast to jsonb for the ? operator
      IF (NEW.content::jsonb) ? 'nodes' THEN
        RAISE LOG '[REALTIME] projects nodes structure present in NEW content';
      END IF;
    END IF;
  END IF;
  
  -- Log additional context for INSERT operations
  IF v_operation = 'INSERT' THEN
    -- FIX: Cast json to jsonb for jsonb_array_length function
    BEGIN
      v_node_count := jsonb_array_length((NEW.content::jsonb)->'nodes');
    EXCEPTION WHEN OTHERS THEN
      v_node_count := 0;
      RAISE LOG '[REALTIME] Could not count nodes on INSERT, defaulting to 0: %', SQLERRM;
    END;
    
    RAISE LOG '[REALTIME] projects INSERT details: project_id=%, node_count=%, user_id=%',
      v_project_id,
      COALESCE(v_node_count, 0),
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
'Fixed trigger function that resolves JSONB COALESCE type conversion error. Logs trigger invocation, content changes, node updates, broadcast attempts, success/failure, and execution time. Uses realtime.broadcast_changes for scalability.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed JSONB COALESCE error in notify_project_changes function';
  RAISE NOTICE '✅ Removed problematic ''[]''::jsonb type coercion';
  RAISE NOTICE '✅ Added error handling for jsonb_array_length calls';
  RAISE NOTICE 'Test by updating a project - should no longer see "COALESCE could not convert type jsonb to json" error';
END $$;
