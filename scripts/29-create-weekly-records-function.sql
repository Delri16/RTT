-- Create function to get weekly records for a group
CREATE OR REPLACE FUNCTION get_group_weekly_records(p_group_id UUID)
RETURNS TABLE (
  username TEXT,
  points INTEGER,
  week_number INTEGER,
  week_start DATE,
  week_end DATE
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get the maximum points per week and find all users who achieved it
  RETURN QUERY
  WITH weekly_totals AS (
    SELECT 
      ua.username,
      ua.group_id,
      EXTRACT(WEEK FROM ua.completed_at)::INTEGER as week_num,
      DATE_TRUNC('week', ua.completed_at)::DATE as w_start,
      (DATE_TRUNC('week', ua.completed_at) + INTERVAL '6 days')::DATE as w_end,
      SUM(ua.points_earned) as total_points
    FROM user_activities ua
    WHERE ua.group_id = p_group_id
    GROUP BY ua.username, ua.group_id, week_num, w_start, w_end
  ),
  max_weekly_points AS (
    SELECT 
      MAX(total_points) as max_points
    FROM weekly_totals
  )
  SELECT 
    wt.username,
    wt.total_points::INTEGER as points,
    wt.week_num as week_number,
    wt.w_start as week_start,
    wt.w_end as week_end
  FROM weekly_totals wt
  CROSS JOIN max_weekly_points mwp
  WHERE wt.total_points = mwp.max_points
  ORDER BY wt.week_num DESC, wt.username ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_group_weekly_records(UUID) TO authenticated, anon;
