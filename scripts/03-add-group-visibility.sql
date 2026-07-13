-- Add visibility and invite code to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Create function to generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate invite codes for existing groups
UPDATE groups SET invite_code = generate_invite_code() WHERE invite_code IS NULL;

-- Create trigger to auto-generate invite codes for new groups
CREATE OR REPLACE FUNCTION set_invite_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code := generate_invite_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invite_code ON groups;
CREATE TRIGGER trigger_set_invite_code
    BEFORE INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION set_invite_code();

-- Add member count view for better performance
CREATE OR REPLACE VIEW group_stats AS
SELECT 
    g.*,
    COUNT(gm.username) as member_count,
    COALESCE(SUM(ua.points_earned), 0) as total_points
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN user_activities ua ON g.id = ua.group_id
GROUP BY g.id, g.name, g.description, g.end_date, g.created_by, g.created_at, g.is_public, g.invite_code;
