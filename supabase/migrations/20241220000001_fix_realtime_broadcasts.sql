-- Migration: Fix realtime broadcasts for projects and fal_jobs
-- Created: 2024-12-20
-- Description: Fixes project broadcast trigger and adds fal_jobs broadcast trigger

-- ============================================================================
-- FIX PROJECT BROADCAST TRIGGER
-- ============================================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS projects_broadcast_trigger ON project;

-- Create corrected trigger function
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
  -- Extract project ID
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
      v_operation,       -- operation: INSERT, UPDATE, or DELETE (this is the event name)
      v_operation,       -- operation type (same as event for consistency)
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
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate trigger on projects table
CREATE TRIGGER projects_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON project
  FOR EACH ROW EXECUTE FUNCTION notify_project_changes();

COMMENT ON FUNCTION notify_project_changes() IS 
'Trigger function that broadcasts project changes using realtime.broadcast_changes. Requires private channels with RLS policies.';

-- ============================================================================
-- ADD FAL_JOBS BROADCAST TRIGGER
-- ============================================================================

-- Create trigger function for fal_jobs
CREATE OR REPLACE FUNCTION notify_fal_job_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id text;
  v_topic text;
  v_operation text;
BEGIN
  -- Extract user ID
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  v_topic := 'fal_jobs:' || v_user_id;
  v_operation := TG_OP;
  
  -- Log broadcast attempt for debugging
  RAISE LOG 'Broadcasting fal_job change: topic=%, operation=%, job_id=%', 
    v_topic, v_operation, COALESCE(NEW.id, OLD.id);
  
  -- Broadcast changes
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
    
    -- Log successful broadcast
    RAISE LOG 'Successfully broadcasted fal_job to topic: %', v_topic;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to broadcast fal_job changes: topic=%, error=%, detail=%', 
      v_topic, SQLERRM, SQLSTATE;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on fal_jobs table
DROP TRIGGER IF EXISTS fal_jobs_broadcast_trigger ON fal_jobs;

CREATE TRIGGER fal_jobs_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON fal_jobs
  FOR EACH ROW EXECUTE FUNCTION notify_fal_job_changes();

COMMENT ON FUNCTION notify_fal_job_changes() IS 
'Trigger function that broadcasts fal_jobs changes using realtime.broadcast_changes. Requires private channels with RLS policies.';
