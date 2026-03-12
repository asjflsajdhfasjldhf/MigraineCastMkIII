// Weather data fetching and utilities

import { WeatherData, HourlyForecast, DailyForecast } from '@/types';

const OPEN_METEO_API = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_ARCHIVE =
  'https://archive.open-meteo.com/v1/archive';

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: {
    time: string;
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    pressure_msl: number;
    relative_humidity_2m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    pressure_msl: number[];
    uv_index: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

/**
 * Fetch current weather data
 */
export async function getCurrentWeather(
  lat: number,
  lon: number
): Promise<WeatherData> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'temperature_2m,weather_code,wind_speed_10m,pressure_msl,relative_humidity_2m',
      timezone: 'auto',
    });

    const response = await fetch(`${OPEN_METEO_API}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch current weather');

    const data: OpenMeteoResponse = await response.json();

    return {
      lat: data.latitude,
      lon: data.longitude,
      timezone: data.timezone,
      current: {
        time: data.current?.time || new Date().toISOString(),
        temperature: data.current?.temperature_2m || 0,
        weather_code: data.current?.weather_code || 0,
        wind_speed: data.current?.wind_speed_10m || 0,
        pressure_msl: data.current?.pressure_msl || 1013,
        relative_humidity: data.current?.relative_humidity_2m || 50,
      },
    };
  } catch (error) {
    console.error('Error fetching current weather:', error);
    throw error;
  }
}

/**
 * Fetch hourly forecast (72 hours)
 */
export async function getHourlyForecast(
  lat: number,
  lon: number
): Promise<HourlyForecast[]> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,pressure_msl,uv_index',
      timezone: 'auto',
      forecast_days: '3',
    });

    const response = await fetch(`${OPEN_METEO_API}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch hourly forecast');

    const data: OpenMeteoResponse = await response.json();

    const forecasts: HourlyForecast[] = [];
    if (data.hourly) {
      for (let i = 0; i < Math.min(72, data.hourly.time.length); i++) {
        forecasts.push({
          time: data.hourly.time[i],
          temperature: data.hourly.temperature_2m[i] || 0,
          pressure: data.hourly.pressure_msl[i] || 1013,
          pressure_change_6h: null,
          humidity: data.hourly.relative_humidity_2m[i] || 50,
          wind_speed: data.hourly.wind_speed_10m[i] || 0,
          uv_index: data.hourly.uv_index?.[i] || null,
          pm25: null, // Will be fetched separately
          no2: null,
          ozone: null,
          krii_value: 0, // Will be calculated
          krii_level: 'low', // Will be calculated
        });
      }
    }

    return forecasts;
  } catch (error) {
    console.error('Error fetching hourly forecast:', error);
    throw error;
  }
}

/**
 * Fetch daily forecast (5 days)
 */
export async function getDailyForecast(
  lat: number,
  lon: number
): Promise<DailyForecast[]> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
      timezone: 'auto',
      forecast_days: '5',
    });

    const response = await fetch(`${OPEN_METEO_API}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch daily forecast');

    const data: OpenMeteoResponse = await response.json();

    const forecasts: DailyForecast[] = [];
    if (data.daily) {
      for (let i = 0; i < data.daily.time.length; i++) {
        forecasts.push({
          date: data.daily.time[i],
          krii_peak: 0, // Will be calculated
          krii_level: 'low', // Will be calculated
          temperature_max: data.daily.temperature_2m_max[i] || 0,
          temperature_min: data.daily.temperature_2m_min[i] || 0,
          weather_code: data.daily.weather_code[i] || 0,
        });
      }
    }

    return forecasts;
  } catch (error) {
    console.error('Error fetching daily forecast:', error);
    throw error;
  }
}

/**
 * Fetch historical weather data for lag features
 */
export async function getHistoricalWeather(
  lat: number,
  lon: number,
  date: Date
): Promise<{
  pressure_6h_ago: number | null;
  pressure_12h_ago: number | null;
  pressure_24h_ago: number | null;
  pressure_48h_ago: number | null;
  temp_6h_ago: number | null;
  temp_24h_ago: number | null;
}> {
  try {
    // Calculate dates for lag features
    const now = new Date(date);
    const start6h = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const start12h = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const start48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Format dates as YYYY-MM-DD
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      start_date: formatDate(start48h),
      end_date: formatDate(now),
      hourly: 'pressure_msl,temperature_2m',
      timezone: 'auto',
    });

    const response = await fetch(`${OPEN_METEO_ARCHIVE}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch historical weather');

    const data: OpenMeteoResponse = await response.json();

    if (!data.hourly) {
      return {
        pressure_6h_ago: null,
        pressure_12h_ago: null,
        pressure_24h_ago: null,
        pressure_48h_ago: null,
        temp_6h_ago: null,
        temp_24h_ago: null,
      };
    }

    // Find the closest historical values
    const times = data.hourly.time;
    const pressures = data.hourly.pressure_msl;
    const temperatures = data.hourly.temperature_2m;

    const findClosestIndex = (targetDate: Date) => {
      let closestIndex = 0;
      let minDiff = Math.abs(
        new Date(times[0]).getTime() - targetDate.getTime()
      );

      for (let i = 1; i < times.length; i++) {
        const diff = Math.abs(
          new Date(times[i]).getTime() - targetDate.getTime()
        );
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }

      return closestIndex;
    };

    const idx6h = findClosestIndex(start6h);
    const idx12h = findClosestIndex(start12h);
    const idx24h = findClosestIndex(start24h);
    const idx48h = findClosestIndex(start48h);

    return {
      pressure_6h_ago: pressures[idx6h] || null,
      pressure_12h_ago: pressures[idx12h] || null,
      pressure_24h_ago: pressures[idx24h] || null,
      pressure_48h_ago: pressures[idx48h] || null,
      temp_6h_ago: temperatures[idx6h] || null,
      temp_24h_ago: temperatures[idx24h] || null,
    };
  } catch (error) {
    console.error('Error fetching historical weather:', error);
    return {
      pressure_6h_ago: null,
      pressure_12h_ago: null,
      pressure_24h_ago: null,
      pressure_48h_ago: null,
      temp_6h_ago: null,
      temp_24h_ago: null,
    };
  }
}

/**
 * Fetch historical weather values closest to a specific timestamp.
 */
export async function getHistoricalPointWeather(
  lat: number,
  lon: number,
  date: Date
): Promise<{
  pressure: number | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
}> {
  try {
    const startDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      start_date: formatDate(startDate),
      end_date: formatDate(date),
      hourly: 'pressure_msl,temperature_2m,relative_humidity_2m,wind_speed_10m',
      timezone: 'auto',
    });

    const response = await fetch(`${OPEN_METEO_ARCHIVE}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch historical point weather');

    const data: OpenMeteoResponse = await response.json();
    if (!data.hourly || data.hourly.time.length === 0) {
      return {
        pressure: null,
        temperature: null,
        humidity: null,
        wind_speed: null,
      };
    }

    let closestIndex = 0;
    let minDiff = Math.abs(new Date(data.hourly.time[0]).getTime() - date.getTime());

    for (let i = 1; i < data.hourly.time.length; i++) {
      const diff = Math.abs(new Date(data.hourly.time[i]).getTime() - date.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    return {
      pressure: data.hourly.pressure_msl[closestIndex] || null,
      temperature: data.hourly.temperature_2m[closestIndex] || null,
      humidity: data.hourly.relative_humidity_2m[closestIndex] || null,
      wind_speed: data.hourly.wind_speed_10m[closestIndex] || null,
    };
  } catch (error) {
    console.error('Error fetching historical point weather:', error);
    return {
      pressure: null,
      temperature: null,
      humidity: null,
      wind_speed: null,
    };
  }
}

/**
 * Calculate pressure trend
 */
export function calculatePressureTrend(
  current: number,
  previous: number
): 'falling' | 'stable' | 'rising' {
  const diff = current - previous;
  if (diff < -1) return 'falling';
  if (diff > 1) return 'rising';
  return 'stable';
}

/**
 * Geocode location name to coordinates
 */
export async function geocodeLocation(
  locationName: string
): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const params = new URLSearchParams({
      name: locationName,
      count: '1',
      language: 'de',
      format: 'json',
    });

    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params}`
    );
    if (!response.ok) throw new Error('Failed to geocode location');

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    return {
      lat: result.latitude,
      lon: result.longitude,
      name: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}`,
    };
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}
