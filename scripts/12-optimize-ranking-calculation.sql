-- Create optimized function for weekly ranking calculation
-- This calculates the ranking directly in the database for better performance

CREATE OR REPLACE FUNCTION get_weekly_ranking_optimized(
  p_group_id UUID,
  p_username TEXT,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  user_position INTEGER,
  total_users INTEGER,
  user_points INTEGER,
  first_place_username TEXT,
  first_place_points INTEGER,
  third_place_points INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH weekly_points AS (
    -- Aggregate points for each user in the week
    SELECT 
      username,
      SUM(points_earned)::INTEGER as total_points
    FROM user_activities
    WHERE 
      group_id = p_group_id
      AND completed_at >= p_start_date
      AND completed_at <= p_end_date
    GROUP BY username
  ),
  ranked_users AS (
    -- Rank users by points
    SELECT 
      username,
      total_points,
      ROW_NUMBER() OVER (ORDER BY total_points DESC) as position
    FROM weekly_points
  ),
  user_stats AS (
    -- Get current user's stats
    SELECT 
      position::INTEGER as user_pos,
      total_points as user_pts
    FROM ranked_users
    WHERE username = p_username
  ),
  podium_stats AS (
    -- Get first and third place stats
    SELECT 
      MAX(CASE WHEN position = 1 THEN username END) as first_username,
      MAX(CASE WHEN position = 1 THEN total_points END)::INTEGER as first_points,
      MAX(CASE WHEN position = 3 THEN total_points END)::INTEGER as third_points
    FROM ranked_users
  )
  SELECT 
    COALESCE(us.user_pos, 0) as user_position,
    (SELECT COUNT(*)::INTEGER FROM ranked_users) as total_users,
    COALESCE(us.user_pts, 0) as user_points,
    COALESCE(ps.first_username, '') as first_place_username,
    COALESCE(ps.first_points, 0) as first_place_points,
    COALESCE(ps.third_points, 0) as third_place_points
  FROM podium_stats ps
  LEFT JOIN user_stats us ON true;
END;
$$ LANGUAGE plpgsql;
