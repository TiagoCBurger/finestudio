-- Seed: Demo Data (Optional)
-- Created: 2024-12-10
-- Description: Creates demo user and project for development

-- Note: This is for development only
-- In production, users will be created through the auth flow

-- Insert demo user profile (only if not exists)
INSERT INTO profile (id, onboarded_at)
SELECT 
  '00000000-0000-0000-0000-000000000000',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM profile WHERE id = '00000000-0000-0000-0000-000000000000'
);

-- Insert demo project (only if not exists)
INSERT INTO project (
  id,
  name,
  user_id,
  members,
  content,
  created_at
)
SELECT 
  'demo-project-001',
  'Demo Project - Image Generation',
  '00000000-0000-0000-0000-000000000000',
  ARRAY['00000000-0000-0000-0000-000000000000'],
  jsonb_build_object(
    'nodes', '[]'::jsonb,
    'edges', '[]'::jsonb,
    'viewport', jsonb_build_object('x', 0, 'y', 0, 'zoom', 1)
  ),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM project WHERE id = 'demo-project-001'
);