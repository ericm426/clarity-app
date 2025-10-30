-- Create table for storing blocked websites per user
CREATE TABLE blocked_websites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url_pattern TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, url_pattern)
);

-- Create table for tracking active focus sessions with blocking enabled
CREATE TABLE active_blocking_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  focus_session_id UUID REFERENCES focus_sessions(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE blocked_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_blocking_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for blocked_websites
CREATE POLICY "Users can view their own blocked websites"
  ON blocked_websites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blocked websites"
  ON blocked_websites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blocked websites"
  ON blocked_websites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blocked websites"
  ON blocked_websites FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for active_blocking_sessions
CREATE POLICY "Users can view their own active sessions"
  ON active_blocking_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own active sessions"
  ON active_blocking_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active sessions"
  ON active_blocking_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_blocked_websites_user_id ON blocked_websites(user_id);
CREATE INDEX idx_blocked_websites_active ON blocked_websites(user_id, is_active);
CREATE INDEX idx_active_blocking_sessions_user_id ON active_blocking_sessions(user_id);
CREATE INDEX idx_active_blocking_sessions_active ON active_blocking_sessions(user_id, is_active) WHERE is_active = true;

-- Create partial unique index to ensure only one active session per user
-- This replaces the inline UNIQUE constraint that had the WHERE clause
CREATE UNIQUE INDEX idx_active_blocking_sessions_unique_active
  ON active_blocking_sessions(user_id)
  WHERE is_active = true;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on blocked_websites
CREATE TRIGGER update_blocked_websites_updated_at
  BEFORE UPDATE ON blocked_websites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up stale sessions (no heartbeat in 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_blocking_sessions()
RETURNS void AS $$
BEGIN
  UPDATE active_blocking_sessions
  SET is_active = false
  WHERE is_active = true
    AND last_heartbeat < timezone('utc'::text, now()) - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;
