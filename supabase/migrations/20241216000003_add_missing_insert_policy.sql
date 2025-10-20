-- Migration: Add missing INSERT policy for realtime.messages
-- Created: 2024-12-16
-- Description: Allows authenticated users to send broadcasts to project channels they have access to

-- Add INSERT policy for realtime.messages to allow sending broadcasts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'realtime' 
    AND tablename = 'messages' 
    AND policyname = 'users_can_send_project_broadcasts'
  ) THEN
    CREATE POLICY "users_can_send_project_broadcasts"
    ON "realtime"."messages"
    FOR INSERT
    TO authenticated
    WITH CHECK (
      topic LIKE 'project:%' AND
      EXISTS (
        SELECT 1 FROM project
        WHERE project.id = SPLIT_PART(topic, ':', 2)
        AND (
          project.user_id::text = auth.uid()::text 
          OR auth.uid()::text = ANY(project.members)
        )
      )
    );
  END IF;
END $$;

-- Add helpful comment
COMMENT ON POLICY "users_can_send_project_broadcasts" ON "realtime"."messages" 
IS 'Allows authenticated users to send broadcasts to project channels they own or are members of';