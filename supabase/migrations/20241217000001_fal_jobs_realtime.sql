-- Migration: Add broadcast trigger for fal_jobs table
-- Created: 2024-12-17
-- Description: Enables realtime updates for queue monitoring using broadcast for better scalability
-- Requirements: 5.1, 5.2, 8.3

-- Create trigger function for fal_jobs updates
CREATE OR REPLACE FUNCTION fal_jobs_broadcast_trigger()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Broadcast to user-specific channel: fal_jobs:{user_id}
  PERFORM realtime.broadcast_changes(
    'fal_jobs:' || COALESCE(NEW.user_id, OLD.user_id)::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on fal_jobs table
DROP TRIGGER IF EXISTS fal_jobs_broadcast_trigger ON fal_jobs;
CREATE TRIGGER fal_jobs_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON fal_jobs
  FOR EACH ROW EXECUTE FUNCTION fal_jobs_broadcast_trigger();

-- Add RLS policy for realtime.messages (required for private channels)
-- Users can only receive broadcasts for their own fal_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'realtime' 
    AND tablename = 'messages' 
    AND policyname = 'users_can_receive_fal_jobs_broadcasts'
  ) THEN
    CREATE POLICY "users_can_receive_fal_jobs_broadcasts" 
    ON realtime.messages
    FOR SELECT 
    TO authenticated
    USING (
      topic LIKE 'fal_jobs:%' AND
      auth.uid()::text = SPLIT_PART(topic, ':', 2)
    );
  END IF;
END $$;

-- Add RLS policy for INSERT (broadcasting to channels)
-- Users can only broadcast to their own fal_jobs channels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'realtime' 
    AND tablename = 'messages' 
    AND policyname = 'users_can_broadcast_fal_jobs'
  ) THEN
    CREATE POLICY "users_can_broadcast_fal_jobs" 
    ON realtime.messages
    FOR INSERT 
    TO authenticated
    WITH CHECK (
      topic LIKE 'fal_jobs:%' AND
      auth.uid()::text = SPLIT_PART(topic, ':', 2)
    );
  END IF;
END $$;

-- Create index for performance on fal_jobs user_id lookups
CREATE INDEX IF NOT EXISTS idx_fal_jobs_user_id 
ON fal_jobs(user_id);

-- Create index for performance on fal_jobs status and created_at (for filtering recent jobs)
CREATE INDEX IF NOT EXISTS idx_fal_jobs_status_created_at 
ON fal_jobs(status, created_at DESC);

-- Add helpful comment
COMMENT ON FUNCTION fal_jobs_broadcast_trigger() IS 
'Broadcasts fal_jobs changes to user-specific channels (fal_jobs:{user_id}) using realtime.broadcast_changes for queue monitoring';

