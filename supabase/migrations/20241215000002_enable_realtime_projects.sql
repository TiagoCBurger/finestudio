-- Migration: Enable Realtime for projects table
-- Created: 2024-12-15
-- Description: Enables Supabase Realtime for instant project updates when webhooks modify data

-- Enable Realtime for projects table
ALTER PUBLICATION supabase_realtime ADD TABLE project;

-- Add comment explaining the purpose
COMMENT ON TABLE project IS 'Projects table with Realtime enabled for instant webhook updates from fal.ai';
