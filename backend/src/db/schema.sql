CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  call_id VARCHAR(255) NOT NULL UNIQUE,
  caller_phone VARCHAR(50),
  intent VARCHAR(50),
  service_needed VARCHAR(100),
  customer_name VARCHAR(100),
  address_or_city VARCHAR(100),
  preferred_time VARCHAR(100),
  is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
  summary TEXT,
  transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_intent ON calls (intent);
CREATE INDEX IF NOT EXISTS idx_calls_is_emergency ON calls (is_emergency);
