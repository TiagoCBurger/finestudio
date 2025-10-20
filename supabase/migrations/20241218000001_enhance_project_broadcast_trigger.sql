-- Migration: Enhance project broadcast trigger with error handling
-- Created: 2024-12-18
-- Description: Adds explicit error handling, logging, and improved readability to the project broadcast trigger
-- Note: Migrates from realtime.send to realtime.broadcast_changes for better scalability

-- Drop existing trigger first
DROP TRIGGER IF EXISTS projects_broadcast_trigger ON project;

-- Create enhanced trigger function with error handling
CREATE OR REPLACE FUNCTION notify_project_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id text;
  v_topic text;
  v_operation text;
BEGIN
  -- Extract project ID (no unnecessary type cast since id is already text)
  v_project_id := COALESCE(NEW.id, OLD.id);
  v_topic := 'project:' || v_project_id;
  v_operation := TG_OP;
  
  -- Log broadcast attempt for debugging
  RAISE LOG 'Broadcasting project change: topic=%, operation=%, project_id=%', 
    v_topic, v_operation, v_project_id;
  
  -- Broadcast changes with explicit error handling
  -- Using realtime.broadcast_changes for better scalability (requires private channels)
  BEGIN
    PERFORM realtime.broadcast_changes(
      v_topic,           -- topic: 'project:{id}'
      v_operation,       -- operation: INSERT, UPDATE, or DELETE
      'project_updated', -- event name
      TG_TABLE_NAME,     -- table name
      TG_TABLE_SCHEMA,   -- schema name
      NEW,               -- new row data
      OLD                -- old row data
    );
    
    -- Log successful broadcast
    RAISE LOG 'Successfully broadcasted to topic: %', v_topic;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to broadcast project changes: topic=%, error=%, detail=%', 
      v_topic, SQLERRM, SQLSTATE;
    
    -- Continue with the operation even if broadcast fails
    -- This ensures database operations aren't blocked by realtime issues
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate trigger on projects table
CREATE TRIGGER projects_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON project
  FOR EACH ROW EXECUTE FUNCTION notify_project_changes();

-- Update function comment
COMMENT ON FUNCTION notify_project_changes() IS 
'Enhanced trigger function that broadcasts project changes with error handling and logging. Uses realtime.broadcast_changes for scalability and requires private channels with RLS policies.';

