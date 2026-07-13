-- Create push_tokens table to store user notification subscriptions
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES profiles(username) ON DELETE CASCADE,
  token TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(username, endpoint)
);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can insert their own tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (username = current_setting('app.username', true));

CREATE POLICY "Users can view their own tokens"
  ON push_tokens FOR SELECT
  USING (username = current_setting('app.username', true));

CREATE POLICY "Users can update their own tokens"
  ON push_tokens FOR UPDATE
  USING (username = current_setting('app.username', true));

CREATE POLICY "Users can delete their own tokens"
  ON push_tokens FOR DELETE
  USING (username = current_setting('app.username', true));

-- Service role can manage all tokens for broadcasting
CREATE POLICY "Service role can manage all tokens"
  ON push_tokens FOR ALL
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_username ON push_tokens(username);
CREATE INDEX IF NOT EXISTS idx_push_tokens_updated_at ON push_tokens(updated_at DESC);
