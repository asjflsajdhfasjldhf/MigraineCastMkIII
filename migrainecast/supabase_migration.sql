-- MigraineCast Supabase Migration
-- Execute this script in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- migraine_events table
CREATE TABLE IF NOT EXISTS migraine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  recovery_hours FLOAT,
  severity INT CHECK (severity >= 1 AND severity <= 10),
  symptoms TEXT[] DEFAULT '{}',
  prodromal_symptoms TEXT[] DEFAULT '{}',
  notes TEXT,
  krii_value FLOAT,
  stage TEXT DEFAULT 'onset' CHECK (stage IN ('onset', 'active', 'recovery', 'complete'))
);

-- Index for faster queries
CREATE INDEX idx_migraine_events_created_at ON migraine_events(created_at DESC);
CREATE INDEX idx_migraine_events_stage ON migraine_events(stage);
CREATE INDEX idx_migraine_events_started_at ON migraine_events(started_at DESC);

-- medications table
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES migraine_events(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ NOT NULL,
  name TEXT NOT NULL,
  dose_mg INT,
  effectiveness INT CHECK (effectiveness IS NULL OR (effectiveness >= 1 AND effectiveness <= 5)),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for medications
CREATE INDEX idx_medications_event_id ON medications(event_id);

-- environment_snapshots table
CREATE TABLE IF NOT EXISTS environment_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES migraine_events(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL,
  lat FLOAT NOT NULL,
  lon FLOAT NOT NULL,
  -- Pressure
  pressure FLOAT,
  pressure_trend TEXT CHECK (pressure_trend IS NULL OR pressure_trend IN ('falling', 'stable', 'rising')),
  pressure_change_6h FLOAT,
  pressure_change_24h FLOAT,
  -- Lag features
  pressure_6h_ago FLOAT,
  pressure_12h_ago FLOAT,
  pressure_24h_ago FLOAT,
  pressure_48h_ago FLOAT,
  -- Weather data
  temperature FLOAT,
  temperature_absolute FLOAT,
  temp_change_6h FLOAT,
  humidity FLOAT,
  wind_speed FLOAT,
  uv_index FLOAT,
  -- Air quality
  air_quality_pm25 FLOAT,
  air_quality_no2 FLOAT,
  air_quality_ozone FLOAT,
  -- Time context
  hour_of_day INT CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  season TEXT CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for environment snapshots
CREATE INDEX idx_environment_snapshots_event_id ON environment_snapshots(event_id);
CREATE INDEX idx_environment_snapshots_recorded_at ON environment_snapshots(recorded_at DESC);

-- personal_factors table
CREATE TABLE IF NOT EXISTS personal_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES migraine_events(id) ON DELETE CASCADE,
  sleep_hours FLOAT,
  sleep_bedtime TIME,
  sleep_waketime TIME,
  sleep_deviation FLOAT,
  stress_level INT CHECK (stress_level IS NULL OR (stress_level >= 1 AND stress_level <= 5)),
  alcohol_yesterday BOOLEAN,
  caffeine_withdrawal BOOLEAN,
  meals_regular BOOLEAN,
  hydration INT CHECK (hydration IS NULL OR (hydration >= 1 AND hydration <= 5)),
  -- Neurodiversity factors
  sensory_overload INT CHECK (sensory_overload IS NULL OR (sensory_overload >= 1 AND sensory_overload <= 5)),
  masking_intensity INT CHECK (masking_intensity IS NULL OR (masking_intensity >= 1 AND masking_intensity <= 5)),
  social_exhaustion INT CHECK (social_exhaustion IS NULL OR (social_exhaustion >= 1 AND social_exhaustion <= 5)),
  overstimulation INT CHECK (overstimulation IS NULL OR (overstimulation >= 1 AND overstimulation <= 5)),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for personal factors
CREATE INDEX idx_personal_factors_event_id ON personal_factors(event_id);

-- user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default user settings
INSERT INTO user_settings (key, value) VALUES
  ('location_lat', '52.52'),
  ('location_lon', '13.405'),
  ('location_name', 'Berlin'),
  ('email_notifications', 'true'),
  ('sleep_hours_default', '7.5'),
  ('chronotype', 'normal')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS (Row Level Security) - Since this is single-user, we'll keep it simple
ALTER TABLE migraine_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create simple policies (allow all for now, since single-user)
CREATE POLICY "Allow all access" ON migraine_events FOR ALL USING (true);
CREATE POLICY "Allow all access" ON medications FOR ALL USING (true);
CREATE POLICY "Allow all access" ON environment_snapshots FOR ALL USING (true);
CREATE POLICY "Allow all access" ON personal_factors FOR ALL USING (true);
CREATE POLICY "Allow all access" ON user_settings FOR ALL USING (true);
