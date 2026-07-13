-- Create Rodeos tables for mini-league system within groups

-- Table for rodeo fixtures (weekly matchups)
CREATE TABLE IF NOT EXISTS groups_rodeo_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  week_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  week_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  player_a_username TEXT NOT NULL REFERENCES profiles(username) ON DELETE CASCADE,
  player_b_username TEXT REFERENCES profiles(username) ON DELETE CASCADE, -- NULL for bye week
  player_a_points INTEGER DEFAULT 0,
  player_b_points INTEGER DEFAULT 0,
  winner_username TEXT REFERENCES profiles(username) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(group_id, week_number, player_a_username),
  CONSTRAINT valid_players CHECK (player_a_username != player_b_username OR player_b_username IS NULL)
);

-- Table for rodeo standings (cumulative stats per player)
CREATE TABLE IF NOT EXISTS groups_rodeo_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  player_username TEXT NOT NULL REFERENCES profiles(username) ON DELETE CASCADE,
  proteins INTEGER DEFAULT 0, -- 1 per win
  creatinas INTEGER DEFAULT 0, -- 1 per 5 proteins
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  byes INTEGER DEFAULT 0,
  total_points_scored INTEGER DEFAULT 0,
  total_points_against INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0, -- positive for wins, negative for losses
  best_streak INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, player_username)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rodeo_fixtures_group_week ON groups_rodeo_fixtures(group_id, week_number);
CREATE INDEX IF NOT EXISTS idx_rodeo_fixtures_status ON groups_rodeo_fixtures(status);
CREATE INDEX IF NOT EXISTS idx_rodeo_standings_group ON groups_rodeo_standings(group_id);
CREATE INDEX IF NOT EXISTS idx_rodeo_standings_proteins ON groups_rodeo_standings(group_id, proteins DESC);

-- RLS Policies
ALTER TABLE groups_rodeo_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups_rodeo_standings ENABLE ROW LEVEL SECURITY;

-- Allow users to view fixtures for groups they belong to
CREATE POLICY "Users can view rodeo fixtures for their groups"
  ON groups_rodeo_fixtures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups_rodeo_fixtures.group_id
      AND group_members.username = current_setting('request.jwt.claims', true)::json->>'username'
    )
  );

-- Allow users to view standings for groups they belong to
CREATE POLICY "Users can view rodeo standings for their groups"
  ON groups_rodeo_standings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups_rodeo_standings.group_id
      AND group_members.username = current_setting('request.jwt.claims', true)::json->>'username'
    )
  );

-- Allow system to insert/update fixtures (will be done via service role)
CREATE POLICY "Service role can manage rodeo fixtures"
  ON groups_rodeo_fixtures FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow system to insert/update standings (will be done via service role)
CREATE POLICY "Service role can manage rodeo standings"
  ON groups_rodeo_standings FOR ALL
  USING (true)
  WITH CHECK (true);
