-- Add new columns to group_activities table for minute-based activities
ALTER TABLE group_activities 
ADD COLUMN activity_type VARCHAR(20) DEFAULT 'fixed' CHECK (activity_type IN ('fixed', 'per_minute'));

ALTER TABLE group_activities 
ADD COLUMN points_per_minute DECIMAL(5,2) DEFAULT NULL;

ALTER TABLE group_activities 
ADD COLUMN min_minutes INTEGER DEFAULT NULL;

ALTER TABLE group_activities 
ADD COLUMN max_minutes INTEGER DEFAULT NULL;

-- Add new column to user_activities to store minutes performed
ALTER TABLE user_activities 
ADD COLUMN minutes_performed INTEGER DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN group_activities.activity_type IS 'Type of activity: fixed (traditional) or per_minute';
COMMENT ON COLUMN group_activities.points_per_minute IS 'Points earned per minute (only for per_minute activities)';
COMMENT ON COLUMN group_activities.min_minutes IS 'Minimum minutes required (only for per_minute activities)';
COMMENT ON COLUMN group_activities.max_minutes IS 'Maximum minutes allowed (only for per_minute activities)';
COMMENT ON COLUMN user_activities.minutes_performed IS 'Minutes performed (only for per_minute activities)';

-- Update existing activities to be 'fixed' type
UPDATE group_activities SET activity_type = 'fixed' WHERE activity_type IS NULL;
