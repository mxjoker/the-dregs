CREATE OR REPLACE FUNCTION decrement_vibe_check_timer(p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE profiles
  SET vibe_check_timer_expiry = vibe_check_timer_expiry - interval '1 second'
  WHERE user_id = p_user_id
    AND vibe_check_timer_expiry > now()
    AND vibe_check_passed = false;
END; $$;
