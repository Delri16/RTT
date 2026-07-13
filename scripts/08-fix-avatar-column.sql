-- Add avatar column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT 'default';

-- Copy existing avatar_url data to avatar column for compatibility
UPDATE profiles SET avatar = COALESCE(avatar_url, 'default') WHERE avatar IS NULL OR avatar = '';

-- Update any existing profiles with default avatar
UPDATE profiles SET avatar = 'default' WHERE avatar IS NULL OR avatar = '';
UPDATE profiles SET avatar_url = 'default' WHERE avatar_url IS NULL OR avatar_url = '';

-- Create index for faster avatar queries
CREATE INDEX IF NOT EXISTS idx_profiles_avatar ON profiles(avatar);
CREATE INDEX IF NOT EXISTS idx_profiles_username_avatar ON profiles(username, avatar);

-- Ensure both columns stay in sync with a trigger
CREATE OR REPLACE FUNCTION sync_avatar_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- If avatar is updated, sync avatar_url
  IF NEW.avatar IS DISTINCT FROM OLD.avatar THEN
    NEW.avatar_url = NEW.avatar;
  END IF;
  
  -- If avatar_url is updated, sync avatar
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    NEW.avatar = NEW.avatar_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep columns in sync
DROP TRIGGER IF EXISTS sync_avatar_trigger ON profiles;
CREATE TRIGGER sync_avatar_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_avatar_columns();
