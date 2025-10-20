-- Migration: Fix realtime.send function call
-- Created: 2024-12-16
-- Description: Use correct realtime function signature

-- Update trigger function to use correct realtime function
CREATE OR REPLACE FUNCTION notify_project_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use realtime.broadcast_changes with minimal data to prevent raw data in toasts
  -- But only send essential fields, not the full NEW/OLD records
  PERFORM realtime.broadcast_changes(
    'project:' || COALESCE(NEW.id, OLD.id)::text,
    TG_OP,
    'project_updated',
    'project',
    'public',
    jsonb_build_object(
      'id', COALESCE(NEW.id, OLD.id),
      'type', TG_OP,
      'timestamp', NOW()
    ),
    jsonb_build_object(
      'id', COALESCE(OLD.id, NEW.id),
      'type', TG_OP,
      'timestamp', NOW()
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION notify_project_changes() IS 
'Broadcasts minimal project change notifications using realtime.broadcast_changes with limited payload to prevent raw data in UI toasts.';