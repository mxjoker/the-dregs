-- Fix: trigger_seed_user_balances runs in the calling user's security context,
-- which fails RLS on desperation_points_balance and chaos_coins_balance.
-- SECURITY DEFINER makes it run as the function owner (postgres), bypassing RLS.

CREATE OR REPLACE FUNCTION trigger_seed_user_balances()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO desperation_points_balance (user_id, balance, updated_at)
  VALUES (NEW.id, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO chaos_coins_balance (user_id, balance, updated_at)
  VALUES (NEW.id, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END; $$;
