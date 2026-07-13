-- Migrate existing closed fixtures to the history table
-- This populates the groups_rodeo_history table with past weeks' data

INSERT INTO groups_rodeo_history (
  group_id,
  week_number,
  week_start,
  week_end,
  player_a_username,
  player_b_username,
  player_a_points,
  player_b_points,
  winner_username,
  is_bye,
  closed_at
)
SELECT 
  f.group_id,
  f.week_number,
  f.week_start,
  f.week_end,
  f.player_a_username,
  f.player_b_username,
  COALESCE(f.score_a, 0) as player_a_points,
  COALESCE(f.score_b, 0) as player_b_points,
  f.winner_username,
  COALESCE(f.is_bye, false) as is_bye,
  -- Use COALESCE to handle null closed_at values
  COALESCE(f.closed_at, f.created_at, NOW()) as closed_at
FROM groups_rodeo_fixtures f
WHERE f.status = 'closed'
  AND NOT EXISTS (
    -- Don't insert duplicates
    SELECT 1 FROM groups_rodeo_history h
    WHERE h.group_id = f.group_id
      AND h.week_number = f.week_number
      AND h.player_a_username = f.player_a_username
      AND COALESCE(h.player_b_username, '') = COALESCE(f.player_b_username, '')
  )
ORDER BY f.week_number, f.created_at;
