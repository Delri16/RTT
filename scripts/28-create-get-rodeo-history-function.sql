-- Create a function to get rodeo history that bypasses RLS
CREATE OR REPLACE FUNCTION get_rodeo_history(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  group_id UUID,
  week_number INTEGER,
  week_start TIMESTAMP WITH TIME ZONE,
  week_end TIMESTAMP WITH TIME ZONE,
  player_a_username TEXT,
  player_a_points INTEGER,
  player_b_username TEXT,
  player_b_points INTEGER,
  winner_username TEXT,
  is_bye BOOLEAN,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.group_id,
    h.week_number,
    h.week_start,
    h.week_end,
    h.player_a_username,
    h.player_a_points,
    h.player_b_username,
    h.player_b_points,
    h.winner_username,
    h.is_bye,
    h.closed_at,
    h.created_at
  FROM groups_rodeo_history h
  WHERE h.group_id = p_group_id
  ORDER BY h.week_number DESC, h.created_at ASC;
END;
$$;
