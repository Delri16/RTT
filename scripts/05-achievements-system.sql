-- Create achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT REFERENCES profiles(username) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL, -- 'basic', 'intermediate', 'hard', 'impossible'
    achievement_key TEXT NOT NULL, -- unique identifier for the achievement
    achievement_name TEXT NOT NULL,
    achievement_description TEXT NOT NULL,
    activity_id UUID REFERENCES group_activities(id) ON DELETE CASCADE, -- for activity-specific achievements
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(username, group_id, achievement_key)
);

-- Enable RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Public access" ON user_achievements FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_group ON user_achievements(username, group_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_group ON user_achievements(group_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);

-- Function to check if user completed first activity
CREATE OR REPLACE FUNCTION check_first_activity_achievement(p_username TEXT, p_group_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    activity_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO activity_count
    FROM user_activities
    WHERE username = p_username AND group_id = p_group_id;
    
    RETURN activity_count = 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user completed first weight report
CREATE OR REPLACE FUNCTION check_first_weight_achievement(p_username TEXT, p_group_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    report_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO report_count
    FROM bi_weekly_reports
    WHERE username = p_username AND group_id = p_group_id;
    
    RETURN report_count = 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user completed first photo
CREATE OR REPLACE FUNCTION check_first_photo_achievement(p_username TEXT, p_group_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    photo_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO photo_count
    FROM bi_weekly_reports
    WHERE username = p_username AND group_id = p_group_id
    AND (scale_photo_url IS NOT NULL OR body_photo_url IS NOT NULL);
    
    RETURN photo_count = 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get activity count for specific activity
CREATE OR REPLACE FUNCTION get_activity_count(p_username TEXT, p_group_id UUID, p_activity_id UUID)
RETURNS INTEGER AS $$
DECLARE
    activity_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO activity_count
    FROM user_activities
    WHERE username = p_username AND group_id = p_group_id AND activity_id = p_activity_id;
    
    RETURN activity_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get total activity count
CREATE OR REPLACE FUNCTION get_total_activity_count(p_username TEXT, p_group_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count
    FROM user_activities
    WHERE username = p_username AND group_id = p_group_id;
    
    RETURN total_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check consecutive days for same activity
CREATE OR REPLACE FUNCTION check_consecutive_days_activity(p_username TEXT, p_group_id UUID, p_activity_id UUID, p_days INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    max_consecutive INTEGER := 0;
    current_consecutive INTEGER := 0;
    activity_date DATE;
    prev_date DATE;
    activity_cursor CURSOR FOR
        SELECT DISTINCT DATE(completed_at) as activity_date
        FROM user_activities
        WHERE username = p_username AND group_id = p_group_id AND activity_id = p_activity_id
        ORDER BY activity_date;
BEGIN
    FOR activity_record IN activity_cursor LOOP
        activity_date := activity_record.activity_date;
        
        IF prev_date IS NULL OR activity_date = prev_date + INTERVAL '1 day' THEN
            current_consecutive := current_consecutive + 1;
        ELSE
            current_consecutive := 1;
        END IF;
        
        IF current_consecutive > max_consecutive THEN
            max_consecutive := current_consecutive;
        END IF;
        
        prev_date := activity_date;
    END LOOP;
    
    RETURN max_consecutive >= p_days;
END;
$$ LANGUAGE plpgsql;

-- Function to count weekly wins
CREATE OR REPLACE FUNCTION count_weekly_wins(p_username TEXT, p_group_id UUID)
RETURNS INTEGER AS $$
DECLARE
    win_count INTEGER := 0;
    week_start DATE;
    week_end DATE;
    current_date DATE := CURRENT_DATE;
    weeks_back INTEGER := 0;
    user_points INTEGER;
    max_points INTEGER;
BEGIN
    -- Check last 20 weeks for wins
    WHILE weeks_back < 20 LOOP
        week_start := current_date - (weeks_back * 7 + EXTRACT(DOW FROM current_date)::INTEGER) * INTERVAL '1 day';
        week_end := week_start + INTERVAL '6 days';
        
        -- Get user points for this week
        SELECT COALESCE(SUM(points_earned), 0) INTO user_points
        FROM user_activities
        WHERE username = p_username 
        AND group_id = p_group_id
        AND DATE(completed_at) BETWEEN week_start AND week_end;
        
        -- Get max points for this week
        SELECT COALESCE(MAX(weekly_points), 0) INTO max_points
        FROM (
            SELECT SUM(points_earned) as weekly_points
            FROM user_activities
            WHERE group_id = p_group_id
            AND DATE(completed_at) BETWEEN week_start AND week_end
            GROUP BY username
        ) weekly_totals;
        
        -- If user had max points and it's > 0, count as win
        IF user_points > 0 AND user_points = max_points THEN
            win_count := win_count + 1;
        END IF;
        
        weeks_back := weeks_back + 1;
    END LOOP;
    
    RETURN win_count;
END;
$$ LANGUAGE plpgsql;
