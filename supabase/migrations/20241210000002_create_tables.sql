-- Migration: Create Application Tables
-- Created: 2024-12-10
-- Description: Creates profile and project tables with proper RLS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profile table
CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY,
  onboarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project table
CREATE TABLE IF NOT EXISTS project (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  transcription_model VARCHAR NOT NULL DEFAULT 'whisper-1',
  vision_model VARCHAR NOT NULL DEFAULT 'openai-gpt-4.1-nano',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  content JSONB,
  user_id VARCHAR NOT NULL,
  image VARCHAR,
  members TEXT[],
  demo_project BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on tables
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE project ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users can view own profile" 
ON profile FOR SELECT 
USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" 
ON profile FOR UPDATE 
USING (auth.uid()::text = id);

CREATE POLICY "Users can insert own profile" 
ON profile FOR INSERT 
WITH CHECK (auth.uid()::text = id);

-- Project policies
CREATE POLICY "Users can view own projects" 
ON project FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create projects" 
ON project FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own projects" 
ON project FOR UPDATE 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own projects" 
ON project FOR DELETE 
USING (auth.uid()::text = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_user_id ON project(user_id);
CREATE INDEX IF NOT EXISTS idx_project_created_at ON project(created_at);
CREATE INDEX IF NOT EXISTS idx_profile_created_at ON profile(created_at);