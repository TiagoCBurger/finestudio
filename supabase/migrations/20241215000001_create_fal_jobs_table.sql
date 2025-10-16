-- Migration: Create fal_jobs table for tracking async image/video generation
-- Created: 2024-12-15
-- Description: Creates table to track fal.ai queue jobs with webhook support

-- Create fal_jobs table
CREATE TABLE IF NOT EXISTS fal_jobs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  input JSONB NOT NULL,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fal_jobs_request_id ON fal_jobs(request_id);
CREATE INDEX IF NOT EXISTS idx_fal_jobs_user_id ON fal_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_fal_jobs_status ON fal_jobs(status);
CREATE INDEX IF NOT EXISTS idx_fal_jobs_created_at ON fal_jobs(created_at);

-- Enable RLS
ALTER TABLE fal_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own jobs" 
ON fal_jobs FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own jobs" 
ON fal_jobs FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "System can update jobs" 
ON fal_jobs FOR UPDATE 
USING (true); -- Webhook precisa atualizar sem autenticação

-- Add comment
COMMENT ON TABLE fal_jobs IS 'Tracks async image/video generation jobs from fal.ai with webhook support';
