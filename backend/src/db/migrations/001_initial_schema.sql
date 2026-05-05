BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; 

CREATE TABLE IF NOT EXISTS users (
  id                   TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email                TEXT         NOT NULL UNIQUE,
  password_hash        TEXT,                               
  name                 TEXT         NOT NULL,
  age                  SMALLINT,
  gender               TEXT         CHECK (gender IN ('male', 'female', 'other')),
  weight_kg            NUMERIC(6,2),
  height_cm            NUMERIC(5,2),
  goal                 TEXT         CHECK (goal IN ('lose', 'maintain', 'gain')),
  activity_level       TEXT         CHECK (activity_level IN (
                                      'sedentary', 'light', 'moderate', 'active', 'very_active'
                                    )),
  daily_calorie_goal   SMALLINT,
  google_id            TEXT         UNIQUE,
  apple_id             TEXT         UNIQUE,
  onboarding_completed BOOLEAN      NOT NULL DEFAULT FALSE,
  notify_breakfast     BOOLEAN      NOT NULL DEFAULT TRUE,
  notify_lunch         BOOLEAN      NOT NULL DEFAULT TRUE,
  notify_dinner        BOOLEAN      NOT NULL DEFAULT TRUE,
  notify_summary       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  token       TEXT         NOT NULL UNIQUE,
  user_id     TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS push_tokens (
  id           TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id      TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT         NOT NULL UNIQUE,
  platform     TEXT         NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

CREATE TABLE IF NOT EXISTS food_logs (
  id                 TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id            TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id          TEXT,                                
  food_name          TEXT         NOT NULL,
  brand              TEXT,
  calories           SMALLINT     NOT NULL CHECK (calories >= 0),
  protein_g          NUMERIC(7,2) NOT NULL DEFAULT 0,
  carbs_g            NUMERIC(7,2) NOT NULL DEFAULT 0,
  fat_g              NUMERIC(7,2) NOT NULL DEFAULT 0,
  fiber_g            NUMERIC(7,2),
  sodium_mg          NUMERIC(8,2),
  serving_size       NUMERIC(8,2) NOT NULL,
  serving_unit       TEXT         NOT NULL,
  serving_multiplier NUMERIC(6,2) NOT NULL DEFAULT 1,
  meal_type          TEXT         NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  log_date           DATE         NOT NULL DEFAULT CURRENT_DATE,
  logged_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  image_url          TEXT,
  external_food_id   TEXT                                 
);

CREATE INDEX IF NOT EXISTS idx_food_logs_user_date  ON food_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_meal  ON food_logs(user_id, log_date, meal_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_food_logs_client_id ON food_logs(client_id) WHERE client_id IS NOT NULL;

COMMENT ON COLUMN food_logs.external_food_id IS 'External nutrition API food ID (e.g. USDA fdcId).';

CREATE TABLE IF NOT EXISTS weight_entries (
  id          TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id     TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg   NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0),
  log_date    DATE         NOT NULL DEFAULT CURRENT_DATE,
  logged_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_weight_entries_user ON weight_entries(user_id, log_date DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE VIEW daily_nutrition_totals AS
SELECT
  user_id,
  log_date,
  COALESCE(SUM(calories),  0)::INT     AS total_calories,
  COALESCE(SUM(protein_g), 0)::NUMERIC AS total_protein_g,
  COALESCE(SUM(carbs_g),   0)::NUMERIC AS total_carbs_g,
  COALESCE(SUM(fat_g),     0)::NUMERIC AS total_fat_g,
  COUNT(*)::INT                         AS entry_count
FROM food_logs 
GROUP BY user_id, log_date;

COMMIT;