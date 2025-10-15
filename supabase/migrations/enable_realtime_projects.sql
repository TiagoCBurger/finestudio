-- Enable Realtime for projects table
-- This allows the frontend to receive real-time updates when projects are modified
-- Used for webhook updates from fal.ai

ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- Add comment explaining the purpose
COMMENT ON TABLE projects IS 'Projects table with Realtime enabled for webhook updates from fal.ai';
