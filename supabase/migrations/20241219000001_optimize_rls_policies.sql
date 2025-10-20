-- Migration: Optimize RLS policies for realtime.messages
-- Description: Remove unnecessary type casts, use more specific regex patterns, and optimize indexes
-- Date: 2024-12-19

-- ============================================================================
-- STEP 1: Drop old policies
-- ============================================================================

DROP POLICY IF EXISTS "users_can_receive_project_broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "users_can_subscribe_to_own_projects" ON realtime.messages;
DROP POLICY IF EXISTS "users_can_send_project_broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "users_can_broadcast_to_own_projects" ON realtime.messages;

-- ============================================================================
-- STEP 2: Create optimized SELECT policies
-- ============================================================================

-- Optimized SELECT policy for project broadcasts
-- Changes:
-- - Removed unnecessary type casts (id is already text, user_id is varchar which is compatible)
-- - Use more specific regex pattern (^project:[a-f0-9-]+$) instead of LIKE
-- - Simplified auth.uid() casts for consistency
CREATE POLICY "users_can_receive_project_broadcasts" 
ON realtime.messages
FOR SELECT 
TO authenticated
USING (
  topic ~ '^project:[a-f0-9-]+$' AND
  EXISTS (
    SELECT 1 FROM project
    WHERE id = SPLIT_PART(topic, ':', 2)
    AND (
      user_id = (auth.uid())::text 
      OR (auth.uid())::text = ANY(members)
    )
  )
);

-- ============================================================================
-- STEP 3: Create optimized INSERT policies
-- ============================================================================

-- Optimized INSERT policy for project broadcasts
-- Changes:
-- - Removed unnecessary type casts
-- - Use more specific regex pattern
-- - Simplified auth.uid() casts for consistency
CREATE POLICY "users_can_send_project_broadcasts" 
ON realtime.messages
FOR INSERT 
TO authenticated
WITH CHECK (
  topic ~ '^project:[a-f0-9-]+$' AND
  EXISTS (
    SELECT 1 FROM project
    WHERE id = SPLIT_PART(topic, ':', 2)
    AND (
      user_id = (auth.uid())::text 
      OR (auth.uid())::text = ANY(members)
    )
  )
);

-- ============================================================================
-- STEP 4: Optimize indexes
-- ============================================================================

-- Create GIN index on members array for efficient ANY operations
-- This is more efficient than the existing btree index for array membership checks
CREATE INDEX IF NOT EXISTS idx_project_members_gin 
ON project USING GIN(members);

-- The existing indexes are still useful:
-- - idx_project_user_id (btree on user_id) - for user_id lookups
-- - project_pkey (btree on id) - for id lookups (used by SPLIT_PART)

-- ============================================================================
-- STEP 5: Add comments for documentation
-- ============================================================================

COMMENT ON POLICY "users_can_receive_project_broadcasts" ON realtime.messages IS 
'Allows authenticated users to receive broadcasts for projects they own or are members of. Uses regex pattern matching and optimized subquery.';

COMMENT ON POLICY "users_can_send_project_broadcasts" ON realtime.messages IS 
'Allows authenticated users to send broadcasts for projects they own or are members of. Uses regex pattern matching and optimized subquery.';

COMMENT ON INDEX idx_project_members_gin IS 
'GIN index for efficient array membership checks in RLS policies using ANY operator.';
