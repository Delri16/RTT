-- Create table for activity modification requests
CREATE TABLE IF NOT EXISTS activity_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
  requester_username TEXT NOT NULL REFERENCES profiles(username) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('delete', 'edit_date')),
  
  -- For edit_date requests
  new_date TIMESTAMP WITH TIME ZONE,
  
  -- Request metadata
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Admin response
  reviewed_by TEXT REFERENCES profiles(username) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_requests_group_id ON activity_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_requests_status ON activity_requests(status);
CREATE INDEX IF NOT EXISTS idx_activity_requests_requester ON activity_requests(requester_username);
CREATE INDEX IF NOT EXISTS idx_activity_requests_created_at ON activity_requests(created_at DESC);

-- Enable RLS
ALTER TABLE activity_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view requests in their groups" ON activity_requests;
DROP POLICY IF EXISTS "Users can create requests for their own activities" ON activity_requests;
DROP POLICY IF EXISTS "Admins can view all requests in their groups" ON activity_requests;
DROP POLICY IF EXISTS "Admins can update requests in their groups" ON activity_requests;

-- RLS Policies
-- Users can view requests in groups they belong to
CREATE POLICY "Users can view requests in their groups"
  ON activity_requests
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE username = auth.jwt() ->> 'user_metadata' ->> 'username'
    )
  );

-- Users can create requests for their own activities
CREATE POLICY "Users can create requests for their own activities"
  ON activity_requests
  FOR INSERT
  WITH CHECK (
    requester_username = auth.jwt() ->> 'user_metadata' ->> 'username'
    AND group_id IN (
      SELECT group_id FROM group_members 
      WHERE username = auth.jwt() ->> 'user_metadata' ->> 'username'
    )
  );

-- Updated to use is_admin instead of role
-- Admins can view all requests in their groups
CREATE POLICY "Admins can view all requests in their groups"
  ON activity_requests
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE username = auth.jwt() ->> 'user_metadata' ->> 'username'
      AND is_admin = true
    )
  );

-- Updated to use is_admin instead of role
-- Admins can update requests (approve/reject) in their groups
CREATE POLICY "Admins can update requests in their groups"
  ON activity_requests
  FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE username = auth.jwt() ->> 'user_metadata' ->> 'username'
      AND is_admin = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_activity_requests_updated_at_trigger ON activity_requests;
CREATE TRIGGER update_activity_requests_updated_at_trigger
  BEFORE UPDATE ON activity_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_requests_updated_at();
