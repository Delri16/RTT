-- Create a materialized history table for rodeo fixtures
-- This improves performance by pre-calculating and storing fixture results

CREATE TABLE IF NOT EXISTS groups_rodeo_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  week_start TIMESTAMP WITH TIME ZONE NOT NULL,
  week_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Player information
  player_a_username TEXT NOT NULL,
  player_a_points INTEGER DEFAULT 0,
  player_b_username TEXT, -- NULL for BYE weeks
  player_b_points INTEGER DEFAULT 0,
  
  -- Result
  winner_username TEXT, -- NULL for draws or BYE
  is_bye BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_fixture_history UNIQUE(group_id, week_number, player_a_username, player_b_username)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_rodeo_history_group ON groups_rodeo_history(group_id);
CREATE INDEX IF NOT EXISTS idx_rodeo_history_week ON groups_rodeo_history(week_number);
CREATE INDEX IF NOT EXISTS idx_rodeo_history_group_week ON groups_rodeo_history(group_id, week_number);

-- RLS policies
ALTER TABLE groups_rodeo_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of their groups"
  ON groups_rodeo_history FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE username = current_setting('request.jwt.claims', true)::json->>'username'
    )
  );

-- Function to populate history when closing a fixture
CREATE OR REPLACE FUNCTION save_fixture_to_history(
  p_fixture_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fixture RECORD;
  v_player_a_points INTEGER;
  v_player_b_points INTEGER;
  v_winner TEXT;
BEGIN
  -- Get fixture details
  SELECT * INTO v_fixture
  FROM groups_rodeo_fixtures
  WHERE id = p_fixture_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found: %', p_fixture_id;
  END IF;
  
  -- Get player points (set to 0 if null/BYE)
  v_player_a_points := COALESCE(v_fixture.player_a_score, 0);
  v_player_b_points := COALESCE(v_fixture.player_b_score, 0);
  
  -- Determine winner
  IF v_fixture.is_bye THEN
    v_winner := v_fixture.player_a;
  ELSIF v_player_a_points > v_player_b_points THEN
    v_winner := v_fixture.player_a;
  ELSIF v_player_b_points > v_player_a_points THEN
    v_winner := v_fixture.player_b;
  ELSE
    v_winner := NULL; -- Draw
  END IF;
  
  -- Insert into history (or update if already exists)
  INSERT INTO groups_rodeo_history (
    group_id,
    week_number,
    week_start,
    week_end,
    player_a_username,
    player_a_points,
    player_b_username,
    player_b_points,
    winner_username,
    is_bye,
    closed_at
  ) VALUES (
    v_fixture.group_id,
    v_fixture.week_number,
    v_fixture.week_start,
    v_fixture.week_end,
    v_fixture.player_a,
    v_player_a_points,
    v_fixture.player_b,
    v_player_b_points,
    v_winner,
    v_fixture.is_bye,
    NOW()
  )
  ON CONFLICT (group_id, week_number, player_a_username, player_b_username)
  DO UPDATE SET
    player_a_points = EXCLUDED.player_a_points,
    player_b_points = EXCLUDED.player_b_points,
    winner_username = EXCLUDED.winner_username,
    closed_at = NOW();
    
END;
$$;
