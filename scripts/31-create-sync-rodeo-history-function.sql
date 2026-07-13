-- Function to sync rodeo history from matchup history
-- Checks groups_rodeo_matchup_history and gets points from user_activities
-- Uses SECURITY DEFINER to bypass RLS policies
-- Excludes the current week (only syncs completed weeks)

CREATE OR REPLACE FUNCTION sync_rodeo_history_from_fixtures(p_group_id UUID)
RETURNS TABLE (
  synced_count INTEGER,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_synced_count INTEGER := 0;
  v_fixture RECORD;
  v_player_a_points INTEGER;
  v_player_b_points INTEGER;
  v_winner TEXT;
  v_current_week INTEGER;
BEGIN
  -- Calculate current week to exclude it from sync
  SELECT EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER INTO v_current_week;

  -- Rewritten to use matchup history instead of fixtures table
  -- Find all weeks with matchup history data
  FOR v_fixture IN 
    SELECT DISTINCT
      f.group_id,
      f.week_number,
      f.week_start,
      f.week_end,
      f.player_a_username,
      f.player_b_username,
      f.is_bye
    FROM groups_rodeo_fixtures f
    WHERE f.group_id = p_group_id
      -- Exclude current week (vigente) from sync
      AND f.week_number < v_current_week
      -- Check if this matchup has been played (exists in matchup_history)
      AND EXISTS (
        SELECT 1 FROM groups_rodeo_matchup_history mh
        WHERE mh.group_id = f.group_id
          AND (
            (mh.player_a_username = f.player_a_username AND mh.player_b_username = f.player_b_username) OR
            (mh.player_a_username = f.player_b_username AND mh.player_b_username = f.player_a_username)
          )
      )
      -- But not in history yet
      AND NOT EXISTS (
        SELECT 1 FROM groups_rodeo_history h
        WHERE h.group_id = f.group_id
          AND h.week_number = f.week_number
          AND h.player_a_username = f.player_a_username
          AND (
            (f.is_bye AND h.is_bye) OR
            (NOT f.is_bye AND h.player_b_username = f.player_b_username)
          )
      )
    ORDER BY f.week_number
  LOOP
    -- Calculate points for player A in this week
    SELECT COALESCE(SUM(points_earned), 0)
    INTO v_player_a_points
    FROM user_activities
    WHERE username = v_fixture.player_a_username
      AND group_id = v_fixture.group_id
      AND completed_at >= v_fixture.week_start
      AND completed_at < v_fixture.week_end + INTERVAL '1 day';

    -- Calculate points for player B in this week (if not BYE)
    IF v_fixture.is_bye THEN
      v_player_b_points := 0;
      v_winner := v_fixture.player_a_username;
    ELSE
      SELECT COALESCE(SUM(points_earned), 0)
      INTO v_player_b_points
      FROM user_activities
      WHERE username = v_fixture.player_b_username
        AND group_id = v_fixture.group_id
        AND completed_at >= v_fixture.week_start
        AND completed_at < v_fixture.week_end + INTERVAL '1 day';

      -- Determine winner
      IF v_player_a_points > v_player_b_points THEN
        v_winner := v_fixture.player_a_username;
      ELSIF v_player_b_points > v_player_a_points THEN
        v_winner := v_fixture.player_b_username;
      ELSE
        v_winner := NULL; -- Draw
      END IF;
    END IF;

    -- Insert into history
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
      v_fixture.player_a_username,
      v_player_a_points,
      v_fixture.player_b_username,
      v_player_b_points,
      v_winner,
      v_fixture.is_bye,
      NOW()
    );
    
    v_synced_count := v_synced_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_synced_count, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 0, SQLERRM;
END;
$$;
