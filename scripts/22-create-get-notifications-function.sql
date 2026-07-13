-- Function to get pending notifications for a user, bypassing RLS
-- This is needed because Server Actions don't have JWT context
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_username TEXT,
  p_notification_type TEXT DEFAULT NULL,
  p_is_read BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_username TEXT,
  group_id UUID,
  notification_type TEXT,
  activity_tag_id UUID,
  activity_request_id UUID,
  title TEXT,
  message TEXT,
  is_read BOOLEAN,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.user_username,
    n.group_id,
    n.notification_type,
    n.activity_tag_id,
    n.activity_request_id,
    n.title,
    n.message,
    n.is_read,
    n.read_at,
    n.created_at
  FROM notifications n
  WHERE n.user_username = p_username
    AND (p_notification_type IS NULL OR n.notification_type = p_notification_type)
    AND (p_is_read IS NULL OR n.is_read = p_is_read)
  ORDER BY n.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_notifications(TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications(TEXT, TEXT, BOOLEAN) TO anon;
