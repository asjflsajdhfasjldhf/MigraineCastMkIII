// KRII (Kopfschmerzrisiko-Index) Calculation Logic

import {
  EnvironmentSnapshot,
  PersonalFactors,
  KRIIResult,
  KRIIFactor,
  RiskLevel,
  Chronotype,
} from '@/types';
import { KRII_CONFIG } from './krii-config';

/**
 * Sigmoid normalization: converts a value to 0-1 range
 * centered around mean with standard deviation
 */
function sigmoid(value: number, mean: number, stdDev: number): number {
  const z = (value - mean) / Math.max(stdDev, 0.1); // Avoid division by zero
  return 1 / (1 + Math.exp(-z));
}

/**
 * Normalize a value to 0-1 range
 */
function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Get season from date
 */
function getSeason(date: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/**
 * Calculate pressure-based risk score (lag-weighted)
 */
function calculatePressureRisk(env: EnvironmentSnapshot): number {
  if (!env.pressure) return 0;

  const config = KRII_CONFIG;
  let pressureRisk = 0;

  // Current pressure risk (absolute level)
  if (env.pressure < config.thresholds.pressure_critical) {
    pressureRisk += 0.2; // Base risk for low pressure
  }

  // Lag-weighted pressure trend (most recent more important)
  const pressures = [
    { value: env.pressure, weight: 0.4 },
    { value: env.pressure_6h_ago, weight: 0.3 },
    { value: env.pressure_12h_ago, weight: 0.2 },
    { value: env.pressure_24h_ago, weight: 0.08 },
    { value: env.pressure_48h_ago, weight: 0.02 },
  ].filter((p) => p.value !== null && p.value !== undefined);

  if (pressures.length > 1) {
    // Falling trend bonus
    const current = pressures[0].value || 0;
    const previous =
      pressures.find((p) => p.weight <= 0.3)?.value ||
      pressures[pressures.length - 1].value ||
      current;

    if (current < previous) {
      pressureRisk += config.pressure_falling_bonus;
    }
  }

  // 6h change risk
  if (
    env.pressure_change_6h &&
    Math.abs(env.pressure_change_6h) > config.thresholds.pressure_6h
  ) {
    pressureRisk += 0.15;
  }

  // 24h change risk
  if (
    env.pressure_change_24h &&
    Math.abs(env.pressure_change_24h) > config.thresholds.pressure_24h
  ) {
    pressureRisk += 0.1;
  }

  return Math.min(1, pressureRisk);
}

/**
 * Calculate temperature-based risk score
 */
function calculateTemperatureRisk(env: EnvironmentSnapshot): number {
  let tempRisk = 0;

  // Absolute high temperature risk
  if (
    env.temperature_absolute &&
    env.temperature_absolute > KRII_CONFIG.thresholds.temp_absolute_high
  ) {
    const heatBonus = normalize(
      env.temperature_absolute,
      KRII_CONFIG.thresholds.temp_absolute_high,
      35
    );
    tempRisk += heatBonus * 0.3;
  }

  // Temperature change risk
  if (
    env.temp_change_6h &&
    Math.abs(env.temp_change_6h) > KRII_CONFIG.thresholds.temp_6h
  ) {
    const changeRisk = normalize(
      Math.abs(env.temp_change_6h),
      KRII_CONFIG.thresholds.temp_6h,
      15
    );
    tempRisk += changeRisk * 0.3;
  }

  return Math.min(1, tempRisk);
}

/**
 * Calculate humidity-based risk score
 */
function calculateHumidityRisk(env: EnvironmentSnapshot): number {
  if (!env.humidity) return 0;

  // Both very low and very high humidity are problematic
  if (env.humidity < 30 || env.humidity > 80) {
    return normalize(
      env.humidity < 30 ? 30 - env.humidity : env.humidity - 80,
      0,
      30
    );
  }

  return 0;
}

/**
 * Calculate UV risk score
 */
function calculateUVRisk(env: EnvironmentSnapshot): number {
  if (!env.uv_index) return 0;

  const { uv_critical } = KRII_CONFIG.thresholds;
  if (env.uv_index >= uv_critical) {
    return normalize(env.uv_index, uv_critical, 12);
  }

  return 0;
}

/**
 * Calculate wind risk score
 */
function calculateWindRisk(env: EnvironmentSnapshot): number {
  if (!env.wind_speed) return 0;

  const { wind_critical } = KRII_CONFIG.thresholds;
  if (env.wind_speed >= wind_critical) {
    return normalize(env.wind_speed, wind_critical, 80);
  }

  return 0;
}

/**
 * Calculate air quality risk score
 */
function calculateAirQualityRisk(env: EnvironmentSnapshot): number {
  let aqRisk = 0;
  const { pm25_critical } = KRII_CONFIG.thresholds;

  if (env.air_quality_pm25 && env.air_quality_pm25 > pm25_critical) {
    aqRisk += normalize(env.air_quality_pm25, pm25_critical, 50) * 0.5;
  }

  if (env.air_quality_no2 && env.air_quality_no2 > 40) {
    aqRisk += normalize(env.air_quality_no2, 40, 100) * 0.3;
  }

  if (env.air_quality_ozone && env.air_quality_ozone > 100) {
    aqRisk += normalize(env.air_quality_ozone, 100, 150) * 0.2;
  }

  return Math.min(1, aqRisk);
}

/**
 * Calculate sleep-based risk score
 */
function calculateSleepRisk(personal: PersonalFactors | null): number {
  if (!personal || personal.sleep_hours === null) return 0;

  // Assume 7.5 hours is optimal
  const optimalSleep = 7.5;
  const deviation = Math.abs(personal.sleep_hours - optimalSleep);

  // Sigmoid normalization: max risk at ±3 hours deviation
  return Math.min(1, sigmoid(deviation, 0, 1.5));
}

/**
 * Calculate stress risk score
 */
function calculateStressRisk(personal: PersonalFactors | null): number {
  if (!personal || personal.stress_level === null) return 0;

  // Linear scale 1-5 to 0-1
  return (personal.stress_level - 1) / 4;
}

/**
 * Calculate alcohol risk score
 */
function calculateAlcoholRisk(personal: PersonalFactors | null): number {
  return personal?.alcohol_yesterday ? 1 : 0;
}

/**
 * Calculate caffeine withdrawal risk score
 */
function calculateCaffeineRisk(personal: PersonalFactors | null): number {
  return personal?.caffeine_withdrawal ? 1 : 0;
}

/**
 * Calculate meals risk score
 */
function calculateMealsRisk(personal: PersonalFactors | null): number {
  return personal?.meals_regular === false ? 1 : 0;
}

/**
 * Calculate hydration risk score
 */
function calculateHydrationRisk(personal: PersonalFactors | null): number {
  if (!personal || personal.hydration === null) return 0;

  // Lower hydration = higher risk
  return (6 - personal.hydration) / 5;
}

/**
 * Calculate neurodiversity-related risk scores
 */
function calculateNeurodiversityRisk(
  personal: PersonalFactors | null
): {
  sensory: number;
  masking: number;
  social: number;
  overstimulation: number;
} {
  if (!personal) {
    return { sensory: 0, masking: 0, social: 0, overstimulation: 0 };
  }

  return {
    sensory: personal.sensory_overload
      ? (personal.sensory_overload - 1) / 4
      : 0,
    masking: personal.masking_intensity
      ? (personal.masking_intensity - 1) / 4
      : 0,
    social: personal.social_exhaustion
      ? (personal.social_exhaustion - 1) / 4
      : 0,
    overstimulation: personal.overstimulation
      ? (personal.overstimulation - 1) / 4
      : 0,
  };
}

/**
 * Calculate circadian peak bonus
 */
function getCircadianBonus(hour: number, chronotype: Chronotype): number {
  const peakHours = KRII_CONFIG.circadian_risk[chronotype].peak_hours;
  return peakHours.includes(hour) ? 0.1 : 0;
}

/**
 * Calculate total KRII value
 */
export function calculateKRII(
  env: EnvironmentSnapshot,
  personal: PersonalFactors | null,
  chronotype: Chronotype = 'normal'
): KRIIResult {
  const config = KRII_CONFIG;
  const factors: KRIIFactor[] = [];

  // Weather factors
  const pressureRisk = calculatePressureRisk(env);
  factors.push({
    name: 'Luftdruck',
    value: pressureRisk,
    weight: config.weights.weather.pressure,
    category: 'weather',
  });

  const temperatureRisk = calculateTemperatureRisk(env);
  factors.push({
    name: 'Temperatur',
    value: temperatureRisk,
    weight: config.weights.weather.temperature,
    category: 'weather',
  });

  const humidityRisk = calculateHumidityRisk(env);
  factors.push({
    name: 'Luftfeuchtigkeit',
    value: humidityRisk,
    weight: config.weights.weather.humidity,
    category: 'weather',
  });

  const uvRisk = calculateUVRisk(env);
  factors.push({
    name: 'UV-Index',
    value: uvRisk,
    weight: config.weights.weather.uv,
    category: 'weather',
  });

  const windRisk = calculateWindRisk(env);
  factors.push({
    name: 'Wind',
    value: windRisk,
    weight: config.weights.weather.wind,
    category: 'weather',
  });

  const aqRisk = calculateAirQualityRisk(env);
  factors.push({
    name: 'Luftqualität',
    value: aqRisk,
    weight: config.weights.weather.air_quality,
    category: 'weather',
  });

  // Personal factors
  const sleepRisk = calculateSleepRisk(personal);
  factors.push({
    name: 'Schlaf',
    value: sleepRisk,
    weight: config.weights.personal.sleep,
    category: 'personal',
  });

  const stressRisk = calculateStressRisk(personal);
  factors.push({
    name: 'Stress',
    value: stressRisk,
    weight: config.weights.personal.stress,
    category: 'personal',
  });

  const alcoholRisk = calculateAlcoholRisk(personal);
  factors.push({
    name: 'Alkohol',
    value: alcoholRisk,
    weight: config.weights.personal.alcohol,
    category: 'personal',
  });

  const caffeineRisk = calculateCaffeineRisk(personal);
  factors.push({
    name: 'Koffeinentzug',
    value: caffeineRisk,
    weight: config.weights.personal.caffeine,
    category: 'personal',
  });

  const mealsRisk = calculateMealsRisk(personal);
  factors.push({
    name: 'Mahlzeiten',
    value: mealsRisk,
    weight: config.weights.personal.meals,
    category: 'personal',
  });

  const hydrationRisk = calculateHydrationRisk(personal);
  factors.push({
    name: 'Flüssigkeitszufuhr',
    value: hydrationRisk,
    weight: config.weights.personal.hydration,
    category: 'personal',
  });

  const neuroRisks = calculateNeurodiversityRisk(personal);
  factors.push({
    name: 'Sensorische Überlastung',
    value: neuroRisks.sensory,
    weight: config.weights.personal.sensory_overload,
    category: 'personal',
  });

  factors.push({
    name: 'Masking-Intensität',
    value: neuroRisks.masking,
    weight: config.weights.personal.masking_intensity,
    category: 'personal',
  });

  factors.push({
    name: 'Soziale Erschöpfung',
    value: neuroRisks.social,
    weight: config.weights.personal.social_exhaustion,
    category: 'personal',
  });

  factors.push({
    name: 'Überreizung',
    value: neuroRisks.overstimulation,
    weight: config.weights.personal.overstimulation,
    category: 'personal',
  });

  // Calculate weighted score
  let totalScore = 0;
  let totalWeight = 0;

  for (const factor of factors) {
    totalScore += factor.value * factor.weight;
    totalWeight += factor.weight;
  }

  let kriiValue = totalWeight > 0 ? totalScore / totalWeight : 0;

  // Apply circadian adjustment
  const circadianBonus = getCircadianBonus(env.hour_of_day, chronotype);
  kriiValue += circadianBonus;

  // Apply seasonal bonus (April-October)
  const recordedDate = new Date(env.recorded_at);
  const seasonValue = getSeason(recordedDate);
  if (seasonValue === 'spring' || seasonValue === 'summer') {
    kriiValue += config.seasonal_bonus * 0.05;
  }

  // Apply combination effect (if >3 factors > 0.5)
  const activeFactors = factors.filter((f) => f.value > 0.5).length;
  if (activeFactors > 3) {
    kriiValue *= config.combination_multiplier;
  }

  kriiValue = Math.min(1, Math.max(0, kriiValue));

  // Determine risk level
  let level: RiskLevel;
  if (kriiValue < config.thresholds.low) {
    level = 'low';
  } else if (kriiValue < config.thresholds.medium) {
    level = 'medium';
  } else {
    level = 'high';
  }

  // Identify primary triggers
  const primaryTriggers = factors
    .filter((f) => f.value > 0.5)
    .sort((a, b) => (b.value * b.weight) - (a.value * a.weight))
    .slice(0, 3)
    .map((f) => f.name);

  return {
    value: kriiValue,
    level,
    factors: factors
      .filter((f) => f.value > 0.1) // Only include significant factors
      .sort((a, b) => (b.value * b.weight) - (a.value * a.weight)),
    primaryTriggers,
  };
}
