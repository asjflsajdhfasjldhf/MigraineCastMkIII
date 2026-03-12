// Air quality data fetching

import { AirQualityData } from '@/types';

const OPEN_METEO_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const OPEN_METEO_ARCHIVE =
  'https://archive-api.open-meteo.com/v1/archive';

interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  hourly?: {
    time: string[];
    pm2_5: number[];
    nitrogen_dioxide: number[];
    ozone: number[];
    uv_index: number[];
  };
  current?: {
    time: string;
    pm2_5: number;
    nitrogen_dioxide: number;
    ozone: number;
    uv_index: number;
  };
}

const toNullableNumber = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * Fetch current air quality
 */
export async function getCurrentAirQuality(
  lat: number,
  lon: number
): Promise<{
  pm25: number | null;
  no2: number | null;
  ozone: number | null;
  uv_index: number | null;
}> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'pm2_5,nitrogen_dioxide,ozone,uv_index',
      timezone: 'auto',
    });

    const response = await fetch(`${OPEN_METEO_API}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch current air quality');

    const data: OpenMeteoAirQualityResponse = await response.json();

    return {
      pm25: toNullableNumber(data.current?.pm2_5),
      no2: toNullableNumber(data.current?.nitrogen_dioxide),
      ozone: toNullableNumber(data.current?.ozone),
      uv_index: toNullableNumber(data.current?.uv_index),
    };
  } catch (error) {
    console.error('Error fetching current air quality:', error);
    return {
      pm25: null,
      no2: null,
      ozone: null,
      uv_index: null,
    };
  }
}

/**
 * Fetch hourly air quality forecast (72 hours)
 */
export async function getHourlyAirQuality(
  lat: number,
  lon: number
): Promise<{
  time: string[];
  pm25: number[];
  no2: number[];
  ozone: number[];
  uv_index: number[];
}> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: 'pm2_5,nitrogen_dioxide,ozone,uv_index',
      timezone: 'auto',
      forecast_days: '3',
    });

    const response = await fetch(`${OPEN_METEO_API}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch hourly air quality');

    const data: OpenMeteoAirQualityResponse = await response.json();

    if (!data.hourly) {
      return {
        time: [],
        pm25: [],
        no2: [],
        ozone: [],
        uv_index: [],
      };
    }

    return {
      time: data.hourly.time || [],
      pm25: data.hourly.pm2_5 || [],
      no2: data.hourly.nitrogen_dioxide || [],
      ozone: data.hourly.ozone || [],
      uv_index: data.hourly.uv_index || [],
    };
  } catch (error) {
    console.error('Error fetching hourly air quality:', error);
    return {
      time: [],
      pm25: [],
      no2: [],
      ozone: [],
      uv_index: [],
    };
  }
}

/**
 * Fetch historical air quality data
 */
export async function getHistoricalAirQuality(
  lat: number,
  lon: number,
  date: Date
): Promise<{
  pm25: number | null;
  no2: number | null;
  ozone: number | null;
}> {
  try {
    const start_date = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    const end_date = new Date(date);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      start_date: formatDate(start_date),
      end_date: formatDate(end_date),
      hourly: 'pm2_5,nitrogen_dioxide,ozone',
      timezone: 'auto',
    });

    const response = await fetch(`${OPEN_METEO_ARCHIVE}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch historical air quality');

    const data: OpenMeteoAirQualityResponse = await response.json();

    if (!data.hourly || data.hourly.pm2_5.length === 0) {
      return {
        pm25: null,
        no2: null,
        ozone: null,
      };
    }

    // Get the most recent value
    const lastIndex = data.hourly.pm2_5.length - 1;

    return {
      pm25: toNullableNumber(data.hourly.pm2_5[lastIndex]),
      no2: toNullableNumber(data.hourly.nitrogen_dioxide[lastIndex]),
      ozone: toNullableNumber(data.hourly.ozone[lastIndex]),
    };
  } catch (error) {
    console.error('Error fetching historical air quality:', error);
    return {
      pm25: null,
      no2: null,
      ozone: null,
    };
  }
}
