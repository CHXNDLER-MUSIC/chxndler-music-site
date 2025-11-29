-- Create chat_messages table for live stream chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  stream_session_id text NOT NULL,
  message_type text NOT NULL DEFAULT 'message', -- 'message', 'join', 'leave'
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT chat_messages_message_length CHECK (char_length(message) <= 500),
  CONSTRAINT chat_messages_session_id_length CHECK (char_length(stream_session_id) <= 100)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS chat_messages_stream_session_idx ON chat_messages(stream_session_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages(user_id);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read all chat messages from any stream session
CREATE POLICY "Users can read all chat messages" ON chat_messages
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own messages only
CREATE POLICY "Users can insert their own messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages only
CREATE POLICY "Users can delete their own messages" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Add a function to clean up old chat messages (keep last 1000 per session)
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages()
RETURNS void AS $$
BEGIN
  -- Delete old messages, keeping the latest 1000 per stream session
  DELETE FROM chat_messages 
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY stream_session_id ORDER BY created_at DESC) as rn
      FROM chat_messages
    ) ranked
    WHERE rn > 1000
  );
END;
$$ LANGUAGE plpgsql;

-- Add avatar_badge_id to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_badge_id uuid REFERENCES badges(id) ON DELETE SET NULL;

-- Add twitch_live_status to profiles for live stream status
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS twitch_live_status boolean DEFAULT false;

-- Create a function to get current stream session ID
CREATE OR REPLACE FUNCTION get_current_stream_session()
RETURNS text AS $$
DECLARE
  session_id text;
BEGIN
  -- Simple session ID based on day + hour to reset every hour
  session_id := 'stream_' || to_char(now(), 'YYYY_MM_DD_HH24');
  RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, DELETE ON chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_chat_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_stream_session() TO authenticated;