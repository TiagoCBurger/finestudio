-- Migration: Fix broadcast payload to prevent raw data in toasts
-- Created: 2024-12-16
-- Description: Replace broadcast_changes with send to avoid sending full project data

-- Update trigger function to send minimal payload
CREATE OR REPLACE FUNCTION notify_project_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Broadcast to project-specific channel with minimal payload
  -- This prevents raw project data from appearing in toasts
  PERFORM realtime.send(
    'project:' || COALESCE(NEW.id, OLD.id)::text,
    'project_updated',
    jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'project_id', COALESCE(NEW.id, OLD.id),
      'timestamp', NOW()
    ),
    false -- Use public channel (false) since we have RLS policies
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION notify_project_changes() IS 
'Broadcasts minimal project change notifications to prevent raw data from appearing in UI toasts. Uses realtime.send instead of broadcast_changes for cleaner payloads.';