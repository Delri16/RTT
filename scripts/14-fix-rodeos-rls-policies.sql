-- Drop existing policies
DROP POLICY IF EXISTS "Members can view rodeo standings" ON groups_rodeo_standings;
DROP POLICY IF EXISTS "Members can insert rodeo standings" ON groups_rodeo_standings;
DROP POLICY IF EXISTS "Members can update rodeo standings" ON groups_rodeo_standings;
DROP POLICY IF EXISTS "Admins can delete rodeo standings" ON groups_rodeo_standings;

DROP POLICY IF EXISTS "Members can view rodeo fixtures" ON groups_rodeo_fixtures;
DROP POLICY IF EXISTS "Members can insert rodeo fixtures" ON groups_rodeo_fixtures;
DROP POLICY IF EXISTS "Members can update rodeo fixtures" ON groups_rodeo_fixtures;
DROP POLICY IF EXISTS "Admins can delete rodeo fixtures" ON groups_rodeo_fixtures;

-- Create simplified RLS policies for groups_rodeo_standings
-- Allow authenticated users to view standings for groups they are members of
CREATE POLICY "Members can view rodeo standings"
ON groups_rodeo_standings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups_rodeo_standings.group_id
    AND group_members.username = auth.jwt() ->> 'user_metadata' ->> 'username'
  )
);

-- Allow authenticated users to insert standings for groups they are members of
CREATE POLICY "Members can insert rodeo standings"
ON groups_rodeo_standings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups_rodeo_standings.group_id
    AND group_members.username = auth.jwt() ->> 'user_metadata' ->> 'username'
  )
);

-- Allow authenticated users to update standings for groups they are members of
CREATE POLICY "Members can update rodeo standings"
ON groups_rodeo_standings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups_rodeo_standings.group_id
    AND group_members.username = auth.jwt() ->> 'user_metadata' ->> 'username'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups_rodeo_standings.group_id
    AND group_members.username = auth.jwt() ->> 'user_metadata' ->> 'username'
  )
);

-- Allow group admins to delete standings
CREATE POLICY "Admins can delete rodeo standings"
ON groups_rodeo_standings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = groups_rodeo_standings.group_id
    AND groups.admin_username = auth.jwt() ->> 'user_metadata' ->> 'username'
  )
);

-- Create simplified RLS policies for groups_rodeo_fixtures
-- Allow authenticated users to view fixtures for groups they are members of
CREATE POLICY "Members can view rodeo fixtures"
ON groups_rodeo_fixtures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups_rodeo_fixtures.group_id
    AND group_members.username = auth.jwt() ->> 'user_metadata' ->> 'username'
  )
);

-- Allow authenticated users to insert fixtures for groups they are members of
CREATE POLICY "Members can insert rodeo fixtures"
ON groups_rodeo_fixtures
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups_rodeo_fixtures.group_id
    AND group_members.username = auth.jwt() ->> 'user_metadata' ->> 'username'
  )
);

-- Allow authenticated users to update fixtures for groups they are members of
CREATE POLICY "Members can update rodeo fixtures"
ON groups_rodeo_fixtures
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups_rodeo_fixtures.group_id
    AND group_members.username = auth.jwt() ->> 'user_metadata' ->> 'username'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups_rodeo_fixtures.group_id
    AND group_members.username = auth.jwt() ->> 'user_metadata' ->> 'username'
  )
);

-- Allow group admins to delete fixtures
CREATE POLICY "Admins can delete rodeo fixtures"
ON groups_rodeo_fixtures
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = groups_rodeo_fixtures.group_id
    AND groups.admin_username = auth.jwt() ->> 'user_metadata' ->> 'username'
  )
);
