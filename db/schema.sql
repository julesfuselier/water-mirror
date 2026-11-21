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

-- Contacts collected by /calculateur (created automatically by lib/leads.js).
CREATE TABLE IF NOT EXISTS leads (
  id              BIGSERIAL PRIMARY KEY,
  email           TEXT        NOT NULL UNIQUE,
  first_name      TEXT,
  city            TEXT,
  profile         TEXT        NOT NULL DEFAULT 'other',  -- student_residence | flatshare | family | manager | other
  interests       TEXT[]      NOT NULL DEFAULT '{}',     -- launch | pilot | partner
  calc            JSONB       NOT NULL DEFAULT '{}',     -- calculator answers and results
  source          TEXT,                                  -- utm_source (instagram, tiktok, share...)
  medium          TEXT,
  campaign        TEXT,
  referrer        TEXT,
  consent_version TEXT        NOT NULL,
  consent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
