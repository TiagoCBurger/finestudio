-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create projects table
CREATE TABLE IF NOT EXISTS project (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  name VARCHAR NOT NULL,
  transcription_model VARCHAR NOT NULL,
  vision_model VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP,
  content JSON,
  user_id VARCHAR NOT NULL,
  image VARCHAR,
  members TEXT[]
);

-- Create profile table
CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  onboarded_at TIMESTAMP,
  credits INTEGER DEFAULT 100 NOT NULL,
  credits_used INTEGER DEFAULT 0 NOT NULL
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  user_id TEXT NOT NULL REFERENCES profile(id),
  amount INTEGER NOT NULL,
  type VARCHAR NOT NULL,
  model_used VARCHAR,
  description TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create fal_jobs table
CREATE TABLE IF NOT EXISTS fal_jobs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  request_id VARCHAR NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES profile(id),
  model_id VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  input JSON,
  result JSON,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_user_id ON project(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fal_jobs_user_id ON fal_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_fal_jobs_request_id ON fal_jobs(request_id);
CREATE INDEX IF NOT EXISTS idx_fal_jobs_status ON fal_jobs(status);