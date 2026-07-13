-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    username TEXT PRIMARY KEY,
    avatar_url TEXT,
    current_weight DECIMAL,
    target_weight DECIMAL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    end_date DATE,
    created_by TEXT REFERENCES profiles(username),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    username TEXT REFERENCES profiles(username) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, username)
);

-- Create group_activities table
CREATE TABLE IF NOT EXISTS group_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    points INT NOT NULL
);

-- Create user_activities table
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT REFERENCES profiles(username) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES group_activities(id) ON DELETE CASCADE,
    points_earned INT,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bi_weekly_reports table
CREATE TABLE IF NOT EXISTS bi_weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT REFERENCES profiles(username) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    scale_photo_url TEXT,
    body_photo_url TEXT,
    reported_weight DECIMAL NOT NULL,
    report_date DATE NOT NULL
);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_weekly_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your app's logic)
-- For now, allowing public read and authenticated write access.
-- This is a starting point, you should refine these policies for production.

-- Profiles
CREATE POLICY "Public can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() IS NOT NULL); -- Example, needs refinement

-- Groups
CREATE POLICY "Public can read groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create groups" ON groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- You would continue creating policies for all tables based on your app's rules.
-- For this example, we'll keep it simple.
