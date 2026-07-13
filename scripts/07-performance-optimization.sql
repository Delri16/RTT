-- Performance optimization script for Road to Toro
-- This script creates indexes and optimizations for faster queries

-- Profiles table optimizations
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_avatar ON profiles(avatar);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);

-- Groups table optimizations
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_is_public ON groups(is_public);
CREATE INDEX IF NOT EXISTS idx_groups_end_date ON groups(end_date);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at);

-- Group members optimizations
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_username ON group_members(username);
CREATE INDEX IF NOT EXISTS idx_group_members_is_admin ON group_members(is_admin);
CREATE INDEX IF NOT EXISTS idx_group_members_joined_at ON group_members(joined_at);
CREATE INDEX IF NOT EXISTS idx_group_members_composite ON group_members(group_id, username);

-- Group activities optimizations
CREATE INDEX IF NOT EXISTS idx_group_activities_group_id ON group_activities(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activities_points ON group_activities(points);

-- User activities optimizations (most important for performance)
CREATE INDEX IF NOT EXISTS idx_user_activities_username ON user_activities(username);
CREATE INDEX IF NOT EXISTS idx_user_activities_group_id ON user_activities(group_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_id ON user_activities(activity_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_completed_at ON user_activities(completed_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_points_earned ON user_activities(points_earned);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_activities_group_username ON user_activities(group_id, username);
CREATE INDEX IF NOT EXISTS idx_user_activities_group_date ON user_activities(group_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_username_date ON user_activities(username, completed_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_ranking ON user_activities(group_id, username, points_earned);

-- Bi-weekly reports optimizations
CREATE INDEX IF NOT EXISTS idx_bi_weekly_reports_username ON bi_weekly_reports(username);
CREATE INDEX IF NOT EXISTS idx_bi_weekly_reports_group_id ON bi_weekly_reports(group_id);
CREATE INDEX IF NOT EXISTS idx_bi_weekly_reports_report_date ON bi_weekly_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_bi_weekly_reports_composite ON bi_weekly_reports(username, group_id, report_date);

-- User achievements optimizations
CREATE INDEX IF NOT EXISTS idx_user_achievements_username ON user_achievements(username);
CREATE INDEX IF NOT EXISTS idx_user_achievements_group_id ON user_achievements(group_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_key ON user_achievements(achievement_key);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at);

-- Create optimized views for common queries
CREATE OR REPLACE VIEW group_rankings AS
SELECT 
  ua.group_id,
  ua.username,
  p.avatar,
  p.avatar_url,
  SUM(ua.points_earned) as total_points,
  COUNT(ua.id) as total_activities,
  MAX(ua.completed_at) as last_activity
FROM user_activities ua
JOIN profiles p ON ua.username = p.username
GROUP BY ua.group_id, ua.username, p.avatar, p.avatar_url;

-- Create view for group statistics
CREATE OR REPLACE VIEW group_stats AS
SELECT 
  g.id as group_id,
  g.name,
  g.description,
  g.created_by,
  g.is_public,
  g.created_at,
  COUNT(DISTINCT gm.username) as member_count,
  COUNT(DISTINCT ga.id) as activity_count,
  COALESCE(SUM(ua.points_earned), 0) as total_points,
  COUNT(ua.id) as total_user_activities
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN group_activities ga ON g.id = ga.group_id
LEFT JOIN user_activities ua ON g.id = ua.group_id
GROUP BY g.id, g.name, g.description, g.created_by, g.is_public, g.created_at;

-- Function to clean old data (optional, run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete user activities older than 1 year
  DELETE FROM user_activities 
  WHERE completed_at < NOW() - INTERVAL '1 year';
  
  -- Delete old bi-weekly reports older than 1 year
  DELETE FROM bi_weekly_reports 
  WHERE report_date < NOW() - INTERVAL '1 year';
  
  -- Update statistics
  ANALYZE profiles;
  ANALYZE groups;
  ANALYZE group_members;
  ANALYZE group_activities;
  ANALYZE user_activities;
  ANALYZE bi_weekly_reports;
  ANALYZE user_achievements;
END;
$$ LANGUAGE plpgsql;

-- Update table statistics for better query planning
ANALYZE profiles;
ANALYZE groups;
ANALYZE group_members;
ANALYZE group_activities;
ANALYZE user_activities;
ANALYZE bi_weekly_reports;
ANALYZE user_achievements;

-- Add foreign key constraints for data integrity (if not already present)
DO $$ 
BEGIN
  -- Group members foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_group_members_group_id') THEN
    ALTER TABLE group_members 
    ADD CONSTRAINT fk_group_members_group_id 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_group_members_username') THEN
    ALTER TABLE group_members 
    ADD CONSTRAINT fk_group_members_username 
    FOREIGN KEY (username) REFERENCES profiles(username) ON DELETE CASCADE;
  END IF;

  -- Group activities foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_group_activities_group_id') THEN
    ALTER TABLE group_activities 
    ADD CONSTRAINT fk_group_activities_group_id 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
  END IF;

  -- User activities foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_user_activities_username') THEN
    ALTER TABLE user_activities 
    ADD CONSTRAINT fk_user_activities_username 
    FOREIGN KEY (username) REFERENCES profiles(username) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_user_activities_group_id') THEN
    ALTER TABLE user_activities 
    ADD CONSTRAINT fk_user_activities_group_id 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_user_activities_activity_id') THEN
    ALTER TABLE user_activities 
    ADD CONSTRAINT fk_user_activities_activity_id 
    FOREIGN KEY (activity_id) REFERENCES group_activities(id) ON DELETE CASCADE;
  END IF;

EXCEPTION
  WHEN others THEN
    -- Ignore errors if constraints already exist or other issues
    NULL;
END $$;
