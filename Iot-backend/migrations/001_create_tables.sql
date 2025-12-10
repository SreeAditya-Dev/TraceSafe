-- create extension for uuid if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE,
  role text,
  last_seen timestamptz
);

CREATE TABLE IF NOT EXISTS iot_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text,
  device_role text,
  crate_temp double precision,
  reefer_temp double precision,
  humidity double precision,
  lat double precision,
  lon double precision,
  fan_on boolean,
  ts timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iot_batch ON iot_readings(batch_id);
CREATE INDEX IF NOT EXISTS idx_iot_ts ON iot_readings(ts);
