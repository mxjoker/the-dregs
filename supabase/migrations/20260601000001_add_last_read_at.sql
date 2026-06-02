-- Add last-read timestamps to matches
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS last_read_at_a timestamptz,
  ADD COLUMN IF NOT EXISTS last_read_at_b timestamptz;

-- RPC: returns count of matches with unread activity for the viewer
-- A match is unread if:
--   (a) the viewer has never opened it (their last_read_at IS NULL), OR
--   (b) there is a message from the other person sent after the viewer's last_read_at
CREATE OR REPLACE FUNCTION get_unread_count(viewer_profile_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM matches m
  WHERE
    -- viewer is a participant
    (m.user_a_id = viewer_profile_id OR m.user_b_id = viewer_profile_id)
    AND (
      -- case 1: viewer never opened the chat
      CASE
        WHEN m.user_a_id = viewer_profile_id THEN m.last_read_at_a IS NULL
        ELSE m.last_read_at_b IS NULL
      END
      OR
      -- case 2: there is a newer message from the other person
      EXISTS (
        SELECT 1
        FROM messages msg
        WHERE
          msg.match_id = m.id
          AND msg.sender_id <> viewer_profile_id
          AND msg.sent_at > COALESCE(
            CASE WHEN m.user_a_id = viewer_profile_id THEN m.last_read_at_a ELSE m.last_read_at_b END,
            '-infinity'::timestamptz
          )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION get_unread_count(uuid) TO authenticated;
