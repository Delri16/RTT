-- Función RPC para obtener activity tags bypaseando RLS
CREATE OR REPLACE FUNCTION get_activity_tags_by_ids(
  p_tag_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  activity_id uuid,
  tagged_user text,
  tagged_by text,
  group_id uuid,
  status text,
  created_at timestamptz,
  responded_at timestamptz,
  rejection_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    at.id,
    at.activity_id,
    at.tagged_user,
    at.tagged_by,
    at.group_id,
    at.status,
    at.created_at,
    at.responded_at,
    at.rejection_reason
  FROM activity_tags at
  WHERE at.id = ANY(p_tag_ids);
END;
$$;

-- Permitir que usuarios autenticados ejecuten esta función
GRANT EXECUTE ON FUNCTION get_activity_tags_by_ids(uuid[]) TO authenticated;
