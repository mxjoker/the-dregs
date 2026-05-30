-- Trigger: seed desperation_points_balance and chaos_coins_balance rows
-- when a new users row is inserted. Runs in the same transaction as the
-- INSERT so balances are always created atomically with the user record.

CREATE OR REPLACE FUNCTION trigger_seed_user_balances()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO desperation_points_balance (user_id, balance, updated_at)
  VALUES (NEW.id, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO chaos_coins_balance (user_id, balance, updated_at)
  VALUES (NEW.id, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER users_seed_balances
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_seed_user_balances();
