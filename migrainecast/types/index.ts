// Types for MigraineCast App

export type MigraineStage = 'onset' | 'active' | 'recovery' | 'complete';

export interface MigraineEvent {
  id: string;
  created_at: string;
  started_at: string;
  ended_at: string | null;
  recovery_hours: number | null;
  severity: number; // 1-10
  symptoms: string[];
  prodromal_symptoms: string[];
  notes: string | null;
  krii_value: number | null;
  stage: MigraineStage;
}

export interface Medication {
  id: string;
  event_id: string;
  taken_at: string;
  name: string;
  dose_mg: number | null;
  effectiveness: number | null; // 1-5
  created_at: string;
}

export interface EnvironmentSnapshot {
  id: string;
  event_id: string;
  recorded_at: string;
  lat: number;
  lon: number;
  // Pressure
  pressure: number | null;
  pressure_trend: 'falling' | 'stable' | 'rising' | null;
  pressure_change_6h: number | null;
  pressure_change_24h: number | null;
  // Lag features
  pressure_6h_ago: number | null;
  pressure_12h_ago: number | null;
  pressure_24h_ago: number | null;
  pressure_48h_ago: number | null;
  // Weather
  temperature: number | null;
  temperature_absolute: number | null;
  temp_change_6h: number | null;
  humidity: number | null;
  wind_speed: number | null;
  uv_index: number | null;
  // Air quality
  air_quality_pm25: number | null;
  air_quality_no2: number | null;
  air_quality_ozone: number | null;
  // Time context
  hour_of_day: number; // 0-23
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  created_at: string;
}

export interface PersonalFactors {
  id: string;
  event_id: string;
  sleep_hours: number | null;
  sleep_bedtime: string | null; // Time as HH:mm
  sleep_waketime: string | null; // Time as HH:mm
  sleep_deviation: number | null;
  stress_level: number | null; // 1-5
  alcohol_yesterday: boolean | null;
  caffeine_withdrawal: boolean | null;
  meals_regular: boolean | null;
  hydration: number | null; // 1-5
  // Neurodiversity
  sensory_overload: number | null; // 1-5
  masking_intensity: number | null; // 1-5
  social_exhaustion: number | null; // 1-5
  overstimulation: number | null; // 1-5
  created_at: string;
}

export interface UserSettings {
  location_lat: string;
  location_lon: string;
  location_name: string;
  email_notifications: string; // 'true' or 'false'
  sleep_hours_default: string; // e.g., '7.5'
  chronotype: 'early' | 'normal' | 'late';
}

export type Chronotype = 'early' | 'normal' | 'late';

// Weather data from Open-Meteo
export interface WeatherData {
  lat: number;
  lon: number;
  timezone: string;
  current: CurrentWeather;
  hourly?: HourlyWeather;
  daily?: DailyWeather;
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  weather_code: number;
  wind_speed: number;
  pressure_msl: number;
  relative_humidity: number;
}

export interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  weather_code: number[];
  wind_speed_10m: number[];
  pressure_msl: number[];
}

export interface DailyWeather {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

export interface AirQualityData {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  hourly?: {
    time: string[];
    pm25: number[];
    no2: number[];
    ozone: number[];
    uv_index: number[];
  };
}

// KRII Risk Levels
export type RiskLevel = 'low' | 'medium' | 'high';

export interface KRIIResult {
  value: number; // 0-1, represents percentage
  level: RiskLevel;
  factors: KRIIFactor[];
  primaryTriggers: string[];
}

export interface KRIIFactor {
  name: string;
  value: number; // 0-1
  weight: number; // 0-1
  category: 'weather' | 'personal' | 'time';
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  pressure: number;
  humidity: number;
  wind_speed: number;
  pm25: number | null;
  krii_value: number;
  krii_level: RiskLevel;
}

export interface DailyForecast {
  date: string;
  krii_peak: number;
  krii_level: RiskLevel;
  temperature_max: number;
  temperature_min: number;
  weather_code: number;
}

export interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}
