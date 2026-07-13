-- Drop existing policies
DROP POLICY IF EXISTS "rodeo_standings_select" ON groups_rodeo_standings;
DROP POLICY IF EXISTS "rodeo_standings_insert" ON groups_rodeo_standings;
DROP POLICY IF EXISTS "rodeo_standings_update" ON groups_rodeo_standings;
DROP POLICY IF EXISTS "rodeo_standings_delete" ON groups_rodeo_standings;

DROP POLICY IF EXISTS "rodeo_fixtures_select" ON groups_rodeo_fixtures;
DROP POLICY IF EXISTS "rodeo_fixtures_insert" ON groups_rodeo_fixtures;
DROP POLICY IF EXISTS "rodeo_fixtures_update" ON groups_rodeo_fixtures;
DROP POLICY IF EXISTS "rodeo_fixtures_delete" ON groups_rodeo_fixtures;

-- Create simple, permissive policies for rodeo standings
CREATE POLICY "rodeo_standings_select"
  ON groups_rodeo_standings FOR SELECT
  USING (true);

CREATE POLICY "rodeo_standings_insert"
  ON groups_rodeo_standings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "rodeo_standings_update"
  ON groups_rodeo_standings FOR UPDATE
  USING (true);

CREATE POLICY "rodeo_standings_delete"
  ON groups_rodeo_standings FOR DELETE
  USING (true);

-- Create simple, permissive policies for rodeo fixtures
CREATE POLICY "rodeo_fixtures_select"
  ON groups_rodeo_fixtures FOR SELECT
  USING (true);

CREATE POLICY "rodeo_fixtures_insert"
  ON groups_rodeo_fixtures FOR INSERT
  WITH CHECK (true);

CREATE POLICY "rodeo_fixtures_update"
  ON groups_rodeo_fixtures FOR UPDATE
  USING (true);

CREATE POLICY "rodeo_fixtures_delete"
  ON groups_rodeo_fixtures FOR DELETE
  USING (true);
