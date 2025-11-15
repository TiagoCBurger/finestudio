-- Migration: Improve project schema
-- Description: Remove unused columns (vision_model, transcription_model) and ensure members array is properly populated

-- Step 1: Populate members array with user_id for existing projects
UPDATE project
SET members = ARRAY[user_id]
WHERE members IS NULL OR NOT (user_id = ANY(members));

-- Step 2: Remove unused columns
ALTER TABLE project
DROP COLUMN IF EXISTS vision_model,
DROP COLUMN IF EXISTS transcription_model;

-- Step 3: Add NOT NULL constraint to members (now that all projects have members)
ALTER TABLE project
ALTER COLUMN members SET NOT NULL;

-- Step 4: Add index for members array operations (if not exists)
CREATE INDEX IF NOT EXISTS idx_project_members ON project USING GIN(members);

-- Step 5: Add foreign key constraint to ensure user_id references profile
ALTER TABLE project
ADD CONSTRAINT fk_project_user_id 
FOREIGN KEY (user_id) 
REFERENCES profile(id) 
ON DELETE CASCADE;

-- Step 6: Add check constraint to ensure user_id is always in members
ALTER TABLE project
ADD CONSTRAINT check_user_in_members 
CHECK (user_id = ANY(members));

-- Step 7: Create function to automatically add user_id to members on insert
CREATE OR REPLACE FUNCTION ensure_user_in_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure members array exists and includes user_id
  IF NEW.members IS NULL THEN
    NEW.members := ARRAY[NEW.user_id];
  ELSIF NOT (NEW.user_id = ANY(NEW.members)) THEN
    NEW.members := array_append(NEW.members, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to ensure user_id is always in members
DROP TRIGGER IF EXISTS trigger_ensure_user_in_members ON project;
CREATE TRIGGER trigger_ensure_user_in_members
  BEFORE INSERT OR UPDATE ON project
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_in_members();

-- Step 9: Add comment to document the schema
COMMENT ON TABLE project IS 'Projects table. Each project must have at least one member (the owner/user_id). Members array contains all user IDs with access to the project.';
COMMENT ON COLUMN project.members IS 'Array of user IDs with access to this project. Always includes user_id (owner).';
COMMENT ON COLUMN project.user_id IS 'Project owner ID. Must be included in members array.';
