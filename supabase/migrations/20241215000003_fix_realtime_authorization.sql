-- Migration: Fix Realtime Authorization for projects table
-- Created: 2024-12-15
-- Description: Ensures RLS policies allow Realtime subscriptions to work properly

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "Users can view own projects" ON project;
DROP POLICY IF EXISTS "Users can create projects" ON project;
DROP POLICY IF EXISTS "Users can update own projects" ON project;
DROP POLICY IF EXISTS "Users can delete own projects" ON project;

-- Recreate policies with proper Realtime support
-- SELECT policy: Users can view their own projects
CREATE POLICY "Users can view own projects" 
ON project FOR SELECT 
TO authenticated
USING (
  auth.uid()::text = user_id 
  OR user_id = ANY(members)
);

-- INSERT policy: Users can create projects
CREATE POLICY "Users can create projects" 
ON project FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- UPDATE policy: Users can update their own projects
CREATE POLICY "Users can update own projects" 
ON project FOR UPDATE 
TO authenticated
USING (
  auth.uid()::text = user_id 
  OR user_id = ANY(members)
)
WITH CHECK (
  auth.uid()::text = user_id 
  OR user_id = ANY(members)
);

-- DELETE policy: Users can delete their own projects
CREATE POLICY "Users can delete own projects" 
ON project FOR DELETE 
TO authenticated
USING (auth.uid()::text = user_id);

-- Grant necessary permissions for Realtime
-- The authenticated role needs SELECT permission for Realtime to work
GRANT SELECT ON project TO authenticated;
GRANT INSERT ON project TO authenticated;
GRANT UPDATE ON project TO authenticated;
GRANT DELETE ON project TO authenticated;

-- Ensure Realtime is enabled (skip if already exists)
DO $$
BEGIN
  -- Try to add table to publication, ignore if already exists
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE project;
  EXCEPTION
    WHEN duplicate_object THEN
      -- Table already in publication, that's fine
      NULL;
  END;
END $$;

-- Add helpful comment
COMMENT ON TABLE project IS 'Projects table with Realtime enabled. RLS policies ensure users only receive updates for their own projects.';
