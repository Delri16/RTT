-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view requests in their groups" ON activity_requests;
DROP POLICY IF EXISTS "Users can create requests for their own activities" ON activity_requests;
DROP POLICY IF EXISTS "Admins can view all requests in their groups" ON activity_requests;
DROP POLICY IF EXISTS "Admins can update requests in their groups" ON activity_requests;

-- Create simple public policies (since we don't use Supabase auth)
-- Anyone can read activity requests
CREATE POLICY "Public read access" 
  ON activity_requests 
  FOR SELECT 
  USING (true);

-- Anyone can create activity requests
CREATE POLICY "Public insert access" 
  ON activity_requests 
  FOR INSERT 
  WITH CHECK (true);

-- Anyone can update activity requests (we'll handle permissions in the app)
CREATE POLICY "Public update access" 
  ON activity_requests 
  FOR UPDATE 
  USING (true);

-- Anyone can delete activity requests
CREATE POLICY "Public delete access" 
  ON activity_requests 
  FOR DELETE 
  USING (true);
