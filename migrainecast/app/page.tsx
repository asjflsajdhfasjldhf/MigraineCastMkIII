// Dashboard Page
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MigraineIndicator } from '@/components/dashboard/MigraineIndicator';
import { WeatherSummary } from '@/components/dashboard/WeatherSummary';
import { RiskAlert } from '@/components/dashboard/RiskAlert';
import { HourlyTable } from '@/components/dashboard/HourlyTable';
import { DailyForecast } from '@/components/dashboard/DailyForecast';
import { Navigation } from '@/components/Navigation';
import {
  EnvironmentSnapshot,
  HourlyForecast,
  DailyForecast as DailyForecastType,
  MigraineEvent,
  WeatherData,
} from '@/types';
import { calculateKRII as calculateKRIIValue } from '@/lib/krii';
import {
  getUserSettings,
  getOpenMigraineEvents,
  hasStoredLocationSettings,
  updateUserSetting,
} from '@/lib/supabase';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [kriiValue, setKriiValue] = useState(0);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyForecast[]>([]);
  const [dailyData, setDailyData] = useState<DailyForecastType[]>([]);
  const [openEvents, setOpenEvents] = useState<MigraineEvent[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [peakData, setPeakData] = useState<{
    percentage: number;
    time: string;
    triggers: string[];
  } | null>(null);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      const berlinFallback = { lat: 52.52, lon: 13.405 };

      const getBrowserCoordinates = async (): Promise<{ lat: number; lon: number; fromBrowser: boolean }> => {
        if (!navigator.geolocation) {
          return { ...berlinFallback, fromBrowser: false };
        }

        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                fromBrowser: true,
              });
            },
            () => resolve({ ...berlinFallback, fromBrowser: false }),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
          );
        });
      };

      const fetchWeatherBundle = async (lat: number, lon: number) => {
        const params = new URLSearchParams({
          type: 'combined',
          lat: lat.toString(),
          lon: lon.toString(),
        });

        const response = await fetch(`/api/weather?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch combined weather data');
        }

        return response.json();
      };

      try {
        const [settings, hasStoredLocation] = await Promise.all([
          getUserSettings().catch(() => ({
            location_lat: '52.52',
            location_lon: '13.405',
            location_name: 'Berlin',
            email_notifications: 'false',
            sleep_hours_default: '7.5',
            chronotype: 'normal' as const,
          })),
          hasStoredLocationSettings().catch((error) => {
            console.error('Error checking stored location in dashboard:', error);
            return false;
          }),
        ]);

        const chronotype = settings.chronotype || 'normal';
        let lat = parseFloat(settings.location_lat || `${berlinFallback.lat}`);
        let lon = parseFloat(settings.location_lon || `${berlinFallback.lon}`);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          lat = berlinFallback.lat;
          lon = berlinFallback.lon;
        }

        if (!hasStoredLocation) {
          const browserCoords = await getBrowserCoordinates();
          lat = browserCoords.lat;
          lon = browserCoords.lon;

          const locationName = browserCoords.fromBrowser
            ? `GPS ${lat.toFixed(3)}, ${lon.toFixed(3)}`
            : 'Berlin';

          setUserLocation(locationName);

          Promise.all([
            updateUserSetting('location_lat', lat.toString()),
            updateUserSetting('location_lon', lon.toString()),
            updateUserSetting('location_name', locationName),
          ]).catch((error) => {
            console.error('Error persisting geolocation to user_settings:', error);
          });
        } else {
          setUserLocation(settings.location_name || 'Berlin');
        }

        const weatherBundle = await fetchWeatherBundle(lat, lon).catch(async () => {
          // Retry once with Berlin fallback if location-based request fails.
          return fetchWeatherBundle(berlinFallback.lat, berlinFallback.lon);
        });

        const weather = {
          lat,
          lon,
          timezone: 'auto',
          current: weatherBundle.current,
        };

        const hourly: HourlyForecast[] = weatherBundle.hourly || [];
        const daily: DailyForecastType[] = weatherBundle.daily || [];

        setWeatherData(weather);

        setHourlyData(hourly);
        setDailyData(daily);

        // Calculate KRII for hourly data and find peak
        let maxKrii = 0;
        let peakIndex = 0;
        const triggerByHour: string[][] = [];

        for (let i = 0; i < hourly.length; i++) {
          const hour = hourly[i];
          const hourDate = new Date(hour.time);
          const pressureChange6h = i >= 6
            ? (hour.pressure ?? 0) - (hourly[i - 6].pressure ?? 0)
            : null;
          const pressureTrend =
            pressureChange6h === null
              ? null
              : pressureChange6h < -1
                ? 'falling'
                : pressureChange6h > 1
                  ? 'rising'
                  : 'stable';

          hourly[i].pressure_change_6h = pressureChange6h;

          const env: EnvironmentSnapshot = {
            id: '',
            event_id: '',
            recorded_at: hour.time,
            lat,
            lon,
            pressure: hour.pressure,
            pressure_trend: pressureTrend,
            pressure_change_6h: pressureChange6h,
            pressure_change_24h: null,
            pressure_6h_ago: null,
            pressure_12h_ago: null,
            pressure_24h_ago: null,
            pressure_48h_ago: null,
            temperature: hour.temperature,
            temperature_absolute: hour.temperature,
            temp_change_6h: null,
            humidity: hour.humidity,
            wind_speed: hour.wind_speed,
            uv_index: hour.uv_index ?? null,
            air_quality_pm25: hour.pm25,
            air_quality_no2: hour.no2 ?? null,
            air_quality_ozone: hour.ozone ?? null,
            hour_of_day: hourDate.getHours(),
            season: getSeason(hourDate),
            created_at: new Date().toISOString(),
          };

          const krii = calculateKRIIValue(env, null, chronotype);
          hourly[i].krii_value = krii.value;
          hourly[i].krii_level = krii.level;
          triggerByHour[i] = krii.primaryTriggers;

          if (krii.value > maxKrii) {
            maxKrii = krii.value;
            peakIndex = i;
          }
        }

        const today = new Date();
        const isSameLocalDay = (a: Date, b: Date) =>
          a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate();

        const todayIndices = hourly
          .map((hour, index) => ({ hour, index }))
          .filter(({ hour }) => isSameLocalDay(new Date(hour.time), today));

        if (todayIndices.length > 0) {
          const todayPeak = todayIndices.reduce((max, item) =>
            item.hour.krii_value > max.hour.krii_value ? item : max
          );
          setKriiValue(todayPeak.hour.krii_value);
          setRiskLevel(todayPeak.hour.krii_level);
        } else if (hourly.length > 0) {
          setKriiValue(hourly[0].krii_value);
          setRiskLevel(hourly[0].krii_level);
        }

        setHourlyData([...hourly]);

        // Calculate daily KRII peak using related hourly windows.
        const dailyWithRisk = daily.map((day) => {
          const dayDate = new Date(day.date);
          const dayStart = new Date(dayDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayDate);
          dayEnd.setHours(23, 59, 59, 999);

          const dayHours = hourly.filter((hour) => {
            const hourDate = new Date(hour.time);
            return hourDate >= dayStart && hourDate <= dayEnd;
          });

          if (dayHours.length === 0) {
            return day;
          }

          const peakHour = dayHours.reduce((currentPeak, hour) =>
            hour.krii_value > currentPeak.krii_value ? hour : currentPeak
          );

          const peakIndexInHourly = hourly.findIndex((hour) => hour.time === peakHour.time);
          const firstPressure = dayHours[0].pressure;
          const lastPressure = dayHours[dayHours.length - 1].pressure;
          const pressureTrend: 'falling' | 'stable' | 'rising' =
            lastPressure - firstPressure < -1
              ? 'falling'
              : lastPressure - firstPressure > 1
                ? 'rising'
                : 'stable';
          const pm25Values = dayHours
            .map((h) => h.pm25)
            .filter((value): value is number => value !== null && value !== undefined);
          const dayPm25 = pm25Values.length > 0
            ? pm25Values.reduce((sum, value) => sum + value, 0) / pm25Values.length
            : null;

          return {
            ...day,
            krii_peak: peakHour.krii_value,
            krii_level: peakHour.krii_level,
            pressure_trend: pressureTrend,
            top_trigger:
              peakIndexInHourly >= 0 && triggerByHour[peakIndexInHourly]?.length
                ? triggerByHour[peakIndexInHourly][0]
                : undefined,
            pm25: dayPm25,
          };
        });

        setDailyData(dailyWithRisk);

        // Find peak in next 72 hours
        if (hourly.length > 0 && maxKrii > 0.5) {
          const peakTime = new Date(hourly[peakIndex].time);
          const timeStr = peakTime.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          });

          const krii = calculateKRIIValue(
            {
              id: '',
              event_id: '',
              recorded_at: hourly[peakIndex].time,
              lat,
              lon,
              pressure: hourly[peakIndex].pressure,
              pressure_trend: null,
              pressure_change_6h: null,
              pressure_change_24h: null,
              pressure_6h_ago: null,
              pressure_12h_ago: null,
              pressure_24h_ago: null,
              pressure_48h_ago: null,
              temperature: hourly[peakIndex].temperature,
              temperature_absolute: hourly[peakIndex].temperature,
              temp_change_6h: null,
              humidity: hourly[peakIndex].humidity,
              wind_speed: hourly[peakIndex].wind_speed,
              uv_index: hourly[peakIndex].uv_index ?? null,
              air_quality_pm25: hourly[peakIndex].pm25,
              air_quality_no2: hourly[peakIndex].no2 ?? null,
              air_quality_ozone: hourly[peakIndex].ozone ?? null,
              hour_of_day: peakTime.getHours(),
              season: getSeason(peakTime),
              created_at: new Date().toISOString(),
            },
            null,
            chronotype
          );

          setPeakData({
            percentage: Math.round(maxKrii * 100),
            time: timeStr,
            triggers: krii.primaryTriggers.slice(0, 3),
          });
          setShowAlert(true);
        }

        // Get open migraine events
        const events = await getOpenMigraineEvents();
        setOpenEvents(events);

        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white/40 rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Lädt Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Navigation */}
        <Navigation showLocationPin={true} locationName={userLocation} />

      {/* Main Content */}
      <div className="app-main max-w-6xl mx-auto dashboard-container py-8">
        {/* Open Migraine Events Alert */}
        {openEvents.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-transparent">
            <p className="text-[13px] text-[rgba(255,255,255,0.5)]">
              Hinweis: Sie haben {openEvents.length} offene Migräneereignis(se).
              Besuchen Sie das{' '}
              <Link href="/journal" className="underline text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Tagebuch
              </Link>
              , um diese zu aktualisieren.
            </p>
          </div>
        )}

        {/* Risk Alert */}
        {peakData && (
          <RiskAlert
            show={showAlert}
            peakPercentage={peakData.percentage}
            peakTime={peakData.time}
            triggers={peakData.triggers}
          />
        )}

        {/* KRII Indicator and Weather Summary */}
        <div className="dashboard-grid-2 mb-6">
          <MigraineIndicator title="Heutiges Risiko" kriiValue={kriiValue} riskLevel={riskLevel} />
          {weatherData && (
            <WeatherSummary
              temperature={weatherData.current.temperature}
              humidity={weatherData.current.relative_humidity}
              windSpeed={weatherData.current.wind_speed}
              pressure={weatherData.current.pressure_msl}
              uvIndex={weatherData.current.uv_index ?? 0}
              pm25={weatherData.current.pm25 ?? null}
            />
          )}
        </div>

        {/* Daily Forecast */}
        <div className="mb-6">
          <DailyForecast data={dailyData} />
        </div>

        {/* Hourly Table */}
        <div className="mb-6">
          <HourlyTable data={hourlyData} />
        </div>
      </div>
    </div>
  );
}
function getSeason(date: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}
