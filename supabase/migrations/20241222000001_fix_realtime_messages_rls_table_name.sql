-- Migration: Fix RLS policies for realtime.messages table
-- Fix table name from 'project' to 'projects' (plural)
-- Created: 2024-12-22

-- Drop existing policies
DROP POLICY IF EXISTS "users_can_subscribe_to_own_projects" ON realtime.messages;
DROP POLICY IF EXISTS "users_can_broadcast_to_own_projects" ON realtime.messages;

-- Policy for SELECT (subscribing to channels)
-- Users can subscribe to project channels if they own the project
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
    AND user_id = auth.uid()::text
  )
);

-- Policy for INSERT (broadcasting to channels)
-- Users can broadcast to project channels if they own the project
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
    AND user_id = auth.uid()::text
  )
);

-- Ensure indexes exist for better performance
CREATE INDEX IF NOT EXISTS idx_realtime_messages_topic 
ON realtime.messages(topic);

CREATE INDEX IF NOT EXISTS idx_project_user_id 
ON project(user_id);

-- Add helpful comment
COMMENT ON POLICY "users_can_subscribe_to_own_projects" ON realtime.messages IS 
'Allows authenticated users to subscribe to realtime channels for projects they own';

COMMENT ON POLICY "users_can_broadcast_to_own_projects" ON realtime.messages IS 
'Allows authenticated users to broadcast to realtime channels for projects they own';
