-- Migration: Fix realtime.send function signature
-- Created: 2024-12-16
-- Description: Use correct realtime.send signature: (payload jsonb, event text, topic text, private boolean)

-- Update trigger function to use correct realtime.send signature
CREATE OR REPLACE FUNCTION notify_project_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use realtime.send with correct signature: (payload jsonb, event text, topic text, private boolean)
  PERFORM realtime.send(
    jsonb_build_object(
      'id', COALESCE(NEW.id, OLD.id),
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'timestamp', NOW()
    ),
    'project_updated',
    'project:' || COALESCE(NEW.id, OLD.id)::text,
    false -- Use public channel
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION notify_project_changes() IS 
'Broadcasts minimal project change notifications using realtime.send with correct signature to prevent raw data in UI toasts.';