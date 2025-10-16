-- Migration: Add broadcast trigger for projects table
-- Created: 2024-12-16
-- Description: Replaces postgres_changes with broadcast for better scalability

-- Create trigger function for project updates
CREATE OR REPLACE FUNCTION notify_project_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Broadcast to project-specific channel
  PERFORM realtime.broadcast_changes(
    'project:' || COALESCE(NEW.id, OLD.id)::text,
    TG_OP,
    'project_updated',
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on projects table
DROP TRIGGER IF EXISTS projects_broadcast_trigger ON project;
CREATE TRIGGER projects_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON project
  FOR EACH ROW EXECUTE FUNCTION notify_project_changes();

-- Add RLS policy for realtime.messages (required for private channels)
-- Users can only receive broadcasts for their own projects
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'realtime' 
    AND tablename = 'messages' 
    AND policyname = 'users_can_receive_project_broadcasts'
  ) THEN
    CREATE POLICY "users_can_receive_project_broadcasts" 
    ON realtime.messages
    FOR SELECT 
    TO authenticated
    USING (
      topic LIKE 'project:%' AND
      EXISTS (
        SELECT 1 FROM project
        WHERE id::text = SPLIT_PART(topic, ':', 2)
        AND (user_id = auth.uid()::text OR auth.uid()::text = ANY(members))
      )
    );
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_project_user_members 
ON project(user_id, members);

-- Add helpful comment
COMMENT ON FUNCTION notify_project_changes() IS 
'Broadcasts project changes to dedicated channels using realtime.broadcast_changes for better scalability than postgres_changes';
