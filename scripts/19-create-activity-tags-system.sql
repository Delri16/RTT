-- Create table for activity tags (when users tag others in activities)
CREATE TABLE IF NOT EXISTS activity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tagged_by TEXT NOT NULL REFERENCES profiles(username) ON DELETE CASCADE,
  tagged_user TEXT NOT NULL REFERENCES profiles(username) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  
  -- Response metadata
  responded_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent self-tagging and duplicate tags
  CONSTRAINT no_self_tag CHECK (tagged_by != tagged_user),
  CONSTRAINT unique_activity_tag UNIQUE (activity_id, tagged_user)
);

-- Create table for notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_username TEXT NOT NULL REFERENCES profiles(username) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('activity_tag', 'activity_request', 'group_invite')),
  
  -- Related entities
  activity_tag_id UUID REFERENCES activity_tags(id) ON DELETE CASCADE,
  activity_request_id UUID REFERENCES activity_requests(id) ON DELETE CASCADE,
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- At least one related entity must be set
  CONSTRAINT has_related_entity CHECK (
    activity_tag_id IS NOT NULL OR 
    activity_request_id IS NOT NULL OR
    notification_type = 'group_invite'
  )
);

-- Indexes for activity_tags
CREATE INDEX IF NOT EXISTS idx_activity_tags_activity_id ON activity_tags(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_tags_group_id ON activity_tags(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_tags_tagged_user ON activity_tags(tagged_user);
CREATE INDEX IF NOT EXISTS idx_activity_tags_status ON activity_tags(status);
CREATE INDEX IF NOT EXISTS idx_activity_tags_created_at ON activity_tags(created_at DESC);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_username);
CREATE INDEX IF NOT EXISTS idx_notifications_group_id ON notifications(group_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);

-- Enable RLS
ALTER TABLE activity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tags in their groups" ON activity_tags;
DROP POLICY IF EXISTS "Users can create tags in their groups" ON activity_tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON activity_tags;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- RLS Policies for activity_tags
-- Users can view tags in groups they belong to
CREATE POLICY "Users can view tags in their groups"
  ON activity_tags
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE username = current_setting('request.jwt.claims', true)::json->>'username'
    )
  );

-- Users can create tags in their groups
CREATE POLICY "Users can create tags in their groups"
  ON activity_tags
  FOR INSERT
  WITH CHECK (
    tagged_by = current_setting('request.jwt.claims', true)::json->>'username'
    AND group_id IN (
      SELECT group_id FROM group_members 
      WHERE username = current_setting('request.jwt.claims', true)::json->>'username'
    )
  );

-- Tagged users can update their tags (accept/reject)
CREATE POLICY "Users can update their own tags"
  ON activity_tags
  FOR UPDATE
  USING (
    tagged_user = current_setting('request.jwt.claims', true)::json->>'username'
  );

-- RLS Policies for notifications
-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (
    user_username = current_setting('request.jwt.claims', true)::json->>'username'
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (
    user_username = current_setting('request.jwt.claims', true)::json->>'username'
  );

-- Allow inserts for notifications (system-level)
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_activity_tags_updated_at_trigger ON activity_tags;
CREATE TRIGGER update_activity_tags_updated_at_trigger
  BEFORE UPDATE ON activity_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_tags_updated_at();

-- Function to automatically create notification when user is tagged
CREATE OR REPLACE FUNCTION create_activity_tag_notification()
RETURNS TRIGGER AS $$
DECLARE
  activity_name TEXT;
  tagger_name TEXT;
BEGIN
  -- Get activity details
  SELECT ga.name INTO activity_name
  FROM user_activities ua
  JOIN group_activities ga ON ua.activity_id = ga.id
  WHERE ua.id = NEW.activity_id;
  
  -- Insert notification for tagged user
  INSERT INTO notifications (
    user_username,
    group_id,
    notification_type,
    activity_tag_id,
    title,
    message
  ) VALUES (
    NEW.tagged_user,
    NEW.group_id,
    'activity_tag',
    NEW.id,
    'Nueva actividad compartida',
    NEW.tagged_by || ' te ha etiquetado en: ' || COALESCE(activity_name, 'una actividad')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification on new tag
DROP TRIGGER IF EXISTS create_activity_tag_notification_trigger ON activity_tags;
CREATE TRIGGER create_activity_tag_notification_trigger
  AFTER INSERT ON activity_tags
  FOR EACH ROW
  EXECUTE FUNCTION create_activity_tag_notification();
