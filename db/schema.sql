-- Reference schema. The API creates it automatically on first call (lib/store.js).
CREATE TABLE IF NOT EXISTS showers (
  id           BIGSERIAL PRIMARY KEY,
  household_id TEXT        NOT NULL DEFAULT 'default',  -- ready for several families
  user_name    TEXT        NOT NULL,
  liters       REAL        NOT NULL CHECK (liters >= 0),
  duration_min REAL        NOT NULL CHECK (duration_min >= 0),
  device_id    TEXT,                                     -- optional ESP32 identifier
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS showers_household_created_idx ON showers (household_id, created_at);
