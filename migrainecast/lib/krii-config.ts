// KRII (Kopfschmerzrisiko-Index) Configuration
// Central configuration for all KRII calculations

export const PERSONAL_DEFAULTS = {
  chronotype: 'normal' as const,
  sleep_hours_default: '7.5' as const,
};

export const KRII_CONFIG = {
  weights: {
    weather: {
      pressure: 0.20, // Lag-weighted pressure trend
      temperature: 0.10, // Change + absolute value
      humidity: 0.08,
      uv: 0.08,
      wind: 0.04,
      air_quality: 0.1, // PM2.5, NO2, Ozone combined
    },
    personal: {
      sleep: 0.08,
      stress: 0.05,
      alcohol: 0.02,
      caffeine: 0.02,
      meals: 0.03,
      hydration: 0.03,
      sensory_overload: 0.08,
      masking_intensity: 0.08,
      social_exhaustion: 0.06,
      overstimulation: 0.05,
    },
  },
  // Total: Weather ~60%, Personal ~40%

  thresholds: {
    pressure_critical: 1007, // hPa absolute
    pressure_6h: 3, // hPa change critical
    pressure_24h: 6,
    temp_6h: 5, // °C
    temp_absolute_high: 28, // °C absolute
    uv_critical: 7,
    wind_critical: 50, // km/h
    pm25_critical: 25, // µg/m³
    low: 0.3,
    medium: 0.6,
  },

  // Circadian weighting: time-of-day risk bonus per chronotype
  circadian_risk: {
    early: { peak_hours: [6, 7, 8, 9] },
    normal: { peak_hours: [8, 9, 10, 14, 15] },
    late: { peak_hours: [12, 13, 14, 15, 16] },
  },

  // Combination effect: if >3 factors active, apply multiplier
  combination_multiplier: 1.15,

  // Pressure direction: extra weight if falling
  pressure_falling_bonus: 0.05,

  // Seasonal bonus: April-October
  seasonal_bonus: 0.05,
};

// Symptom lists
export const SYMPTOM_OPTIONS = [
  'aura',
  'übelkeit',
  'licht',
  'lärm',
  'schwindel',
  'nackensteife',
];

export const PRODROMAL_SYMPTOM_OPTIONS = [
  'gähnen',
  'stimmung',
  'nackensteife',
  'konzentration',
  'lichtempfindlichkeit',
  'heißhunger',
];

export const MEDICATION_NAME_OPTIONS = [
  'Triptan',
  'Ibuprofen',
  'Paracetamol',
  'Aspirin',
  'Metoprolol',
  'Magnesium',
  'Andere',
];
