-- Drop the existing INSERT policy that requires JWT
DROP POLICY IF EXISTS "Users can create tags in their groups" ON activity_tags;

-- Create a new policy that allows both users and service role to insert
CREATE POLICY "Allow tag creation for group members"
  ON activity_tags
  FOR INSERT
  WITH CHECK (
    -- Allow if user is the tagged_by user OR allow service role (for server actions)
    (tagged_by = current_setting('request.jwt.claims', true)::json->>'username'
    AND group_id IN (
      SELECT group_id FROM group_members 
      WHERE username = current_setting('request.jwt.claims', true)::json->>'username'
    ))
    OR 
    -- Allow service role to bypass (for server actions)
    current_setting('role', true) = 'service_role'
  );
