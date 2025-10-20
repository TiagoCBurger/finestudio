-- Migration: Add RLS policies for realtime.messages table
-- This enables private channels with proper authorization
-- Users can only subscribe to channels for projects they own or are members of

-- Enable RLS on realtime.messages if not already enabled
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "users_can_subscribe_to_own_projects" ON realtime.messages;
DROP POLICY IF EXISTS "users_can_broadcast_to_own_projects" ON realtime.messages;

-- Policy for SELECT (subscribing to channels)
-- Users can subscribe to project channels if they own or are members of the project
CREATE POLICY "users_can_subscribe_to_own_projects" 
ON realtime.messages 
FOR SELECT 
TO authenticated
USING (
  -- Allow subscription to channels matching pattern: project:{project_id}
  topic ~ '^project:[a-f0-9-]+$' 
  AND EXISTS (
    SELECT 1 FROM project
    WHERE id::text = SPLIT_PART(topic, ':', 2)
    AND (
      auth.uid()::text = user_id 
      OR user_id = ANY(members)
    )
  )
);

-- Policy for INSERT (broadcasting to channels)
-- Users can broadcast to project channels if they own or are members of the project
CREATE POLICY "users_can_broadcast_to_own_projects" 
ON realtime.messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow broadcasting to channels matching pattern: project:{project_id}
  topic ~ '^project:[a-f0-9-]+$' 
  AND EXISTS (
    SELECT 1 FROM project
    WHERE id::text = SPLIT_PART(topic, ':', 2)
    AND (
      auth.uid()::text = user_id 
      OR user_id = ANY(members)
    )
  )
);

-- Create index for better performance on topic lookups
CREATE INDEX IF NOT EXISTS idx_realtime_messages_topic 
ON realtime.messages(topic);

-- Create index on project table for better RLS policy performance
CREATE INDEX IF NOT EXISTS idx_project_user_id 
ON project(user_id);

-- Add helpful comment
COMMENT ON TABLE realtime.messages IS 'Realtime messages table with RLS policies. Users can only subscribe to and broadcast on channels for projects they own or are members of.';
