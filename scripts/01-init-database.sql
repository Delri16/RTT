-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    points INT NOT NULL
);

-- Create user_activities table
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT REFERENCES profiles(username) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES group_activities(id) ON DELETE CASCADE,
    points_earned INT,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bi_weekly_reports table
CREATE TABLE IF NOT EXISTS bi_weekly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT REFERENCES profiles(username) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    scale_photo_url TEXT,
    body_photo_url TEXT,
    reported_weight DECIMAL NOT NULL,
    report_date DATE NOT NULL
);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('avatars', 'avatars', true),
('report_photos', 'report_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_weekly_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we don't use auth)
CREATE POLICY "Public access" ON profiles FOR ALL USING (true);
CREATE POLICY "Public access" ON groups FOR ALL USING (true);
CREATE POLICY "Public access" ON group_members FOR ALL USING (true);
CREATE POLICY "Public access" ON group_activities FOR ALL USING (true);
CREATE POLICY "Public access" ON user_activities FOR ALL USING (true);
CREATE POLICY "Public access" ON bi_weekly_reports FOR ALL USING (true);

-- Storage policies
CREATE POLICY "Public access" ON storage.objects FOR ALL USING (bucket_id IN ('avatars', 'report_photos'));
