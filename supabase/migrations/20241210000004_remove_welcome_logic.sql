-- Migration: Remove Welcome Logic
-- Created: 2024-12-10
-- Description: Removes onboarded_at from profile and demo_project from project tables

-- Remove onboarded_at column from profile
ALTER TABLE profile DROP COLUMN IF EXISTS onboarded_at;

-- Remove demo_project column from project
ALTER TABLE project DROP COLUMN IF EXISTS demo_project;

-- Done!
SELECT 'Welcome logic removed successfully!' as status;
