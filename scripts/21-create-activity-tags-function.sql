-- Function to create activity tags (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION create_activity_tags(
  p_activity_id UUID,
  p_group_id UUID,
  p_tagged_by TEXT,
  p_tagged_users TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  v_tagged_user TEXT;
BEGIN
  -- Loop through each tagged user and create a tag
  FOREACH v_tagged_user IN ARRAY p_tagged_users
  LOOP
    INSERT INTO activity_tags (
      activity_id,
      group_id,
      tagged_by,
      tagged_user,
      status
    ) VALUES (
      p_activity_id,
      p_group_id,
      p_tagged_by,
      v_tagged_user,
      'pending'
    );
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_activity_tags TO authenticated;
