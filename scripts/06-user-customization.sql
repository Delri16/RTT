-- Add password and avatar fields to profiles table
ALTER TABLE profiles 
ADD COLUMN password TEXT,
ADD COLUMN avatar_url TEXT DEFAULT 'default';

-- Update existing users to have default avatar
UPDATE profiles SET avatar_url = 'default' WHERE avatar_url IS NULL;
