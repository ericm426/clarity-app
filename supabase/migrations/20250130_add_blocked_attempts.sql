-- Create table for tracking blocked website attempts
CREATE TABLE blocked_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocking_session_id UUID REFERENCES active_blocking_sessions(id) ON DELETE CASCADE,
  url_pattern TEXT NOT NULL,
  attempted_url TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE blocked_attempts ENABLE ROW LEVEL SECURITY;

-- Policies for blocked_attempts
CREATE POLICY "Users can view their own blocked attempts"
  ON blocked_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blocked attempts"
  ON blocked_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_blocked_attempts_user_id ON blocked_attempts(user_id);
CREATE INDEX idx_blocked_attempts_session_id ON blocked_attempts(blocking_session_id);
CREATE INDEX idx_blocked_attempts_attempted_at ON blocked_attempts(attempted_at);

-- Add blocked_attempts_count column to active_blocking_sessions
ALTER TABLE active_blocking_sessions
ADD COLUMN blocked_attempts_count INTEGER DEFAULT 0 NOT NULL;

-- Function to increment blocked attempts counter
CREATE OR REPLACE FUNCTION increment_blocked_attempts()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the counter in active_blocking_sessions
  UPDATE active_blocking_sessions
  SET blocked_attempts_count = blocked_attempts_count + 1
  WHERE id = NEW.blocking_session_id AND is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment counter when blocked attempt is logged
CREATE TRIGGER trigger_increment_blocked_attempts
  AFTER INSERT ON blocked_attempts
  FOR EACH ROW
  EXECUTE FUNCTION increment_blocked_attempts();
