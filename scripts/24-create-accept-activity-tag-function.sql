-- Create RPC function to accept an activity tag
-- This function uses SECURITY DEFINER to bypass RLS policies

CREATE OR REPLACE FUNCTION accept_activity_tag(
  p_tag_id UUID,
  p_username TEXT
)
RETURNS TABLE(
  tag_data JSONB,
  original_activity_data JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tag RECORD;
  v_activity RECORD;
BEGIN
  -- Get the tag
  SELECT * INTO v_tag
  FROM activity_tags
  WHERE id = p_tag_id 
    AND tagged_user = p_username
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tag not found or already processed';
  END IF;

  -- Get the original activity
  SELECT ua.*, ga.name as activity_name, ga.activity_type
  INTO v_activity
  FROM user_activities ua
  JOIN group_activities ga ON ua.activity_id = ga.id
  WHERE ua.id = v_tag.activity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original activity not found';
  END IF;

  -- Return the data
  RETURN QUERY
  SELECT 
    to_jsonb(v_tag) as tag_data,
    to_jsonb(v_activity) as original_activity_data;
END;
$$;

-- Updated to use rejection_reason instead of admin_notes which doesn't exist
-- Create RPC function to update activity tag status
CREATE OR REPLACE FUNCTION update_activity_tag_status(
  p_tag_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE activity_tags
  SET 
    status = p_status,
    rejection_reason = COALESCE(p_reason, rejection_reason),
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_tag_id;
  
  -- Mark related notification as read
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE activity_tag_id = p_tag_id;
END;
$$;
