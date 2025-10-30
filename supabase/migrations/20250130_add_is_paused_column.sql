-- Add is_paused column to active_blocking_sessions table
ALTER TABLE active_blocking_sessions
ADD COLUMN is_paused BOOLEAN DEFAULT false NOT NULL;

-- Update the trigger to only increment when session is not paused
DROP FUNCTION IF EXISTS increment_blocked_attempts() CASCADE;

CREATE OR REPLACE FUNCTION increment_blocked_attempts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE active_blocking_sessions
  SET blocked_attempts_count = blocked_attempts_count + 1
  WHERE id = NEW.blocking_session_id
    AND is_active = true
    AND is_paused = false;  -- Only increment if not paused
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_blocked_attempt
  AFTER INSERT ON blocked_attempts
  FOR EACH ROW
  EXECUTE FUNCTION increment_blocked_attempts();
