// Dashboard Page
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MigraineIndicator } from '@/components/dashboard/MigraineIndicator';
import { WeatherSummary } from '@/components/dashboard/WeatherSummary';
import { RiskAlert } from '@/components/dashboard/RiskAlert';
import { HourlyTable } from '@/components/dashboard/HourlyTable';
import { DailyForecast } from '@/components/dashboard/DailyForecast';
import {
  getCurrentWeather,
  getHourlyForecast,
  getDailyForecast,
} from '@/lib/weather';
import {
  calculateKRII,
  EnvironmentSnapshot,
  HourlyForecast,
  DailyForecast as DailyForecastType,
} from '@/types';
import { calculateKRII as calculateKRIIValue } from '@/lib/krii';
import { getUserSettings, getOpenMigraineEvents } from '@/lib/supabase';
import { MigraineEvent } from '@/types';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [kriiValue, setKriiValue] = useState(0);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [hourlyData, setHourlyData] = useState<HourlyForecast[]>([]);
  const [dailyData, setDailyData] = useState<DailyForecastType[]>([]);
  const [openEvents, setOpenEvents] = useState<MigraineEvent[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [peakData, setPeakData] = useState<{
    percentage: number;
    time: string;
    triggers: string[];
  } | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Get user settings for location
        const settings = await getUserSettings();
        const lat = parseFloat(settings.location_lat);
        const lon = parseFloat(settings.location_lon);
        const chronotype = settings.chronotype;

        // Fetch weather data
        const weather = await getCurrentWeather(lat, lon);
        setWeatherData(weather);

        // Fetch hourly and daily forecasts
        const [hourly, daily] = await Promise.all([
          getHourlyForecast(lat, lon),
          getDailyForecast(lat, lon),
        ]);

        setHourlyData(hourly);
        setDailyData(daily);

        // Calculate KRII for current conditions
        const currentEnv: EnvironmentSnapshot = {
          id: '',
          event_id: '',
          recorded_at: new Date().toISOString(),
          lat,
          lon,
          pressure: weather.current.pressure_msl,
          pressure_trend: null,
          pressure_change_6h: null,
          pressure_change_24h: null,
          pressure_6h_ago: null,
          pressure_12h_ago: null,
          pressure_24h_ago: null,
          pressure_48h_ago: null,
          temperature: weather.current.temperature,
          temperature_absolute: weather.current.temperature,
          temp_change_6h: null,
          humidity: weather.current.relative_humidity,
          wind_speed: weather.current.wind_speed,
          uv_index: 0, // Will be fetched from air quality API
          air_quality_pm25: null,
          air_quality_no2: null,
          air_quality_ozone: null,
          hour_of_day: new Date().getHours(),
          season: getSeason(new Date()),
          created_at: new Date().toISOString(),
        };

        const krii = calculateKRIIValue(currentEnv, null, chronotype);
        setKriiValue(krii.value);
        setRiskLevel(krii.level);

        // Calculate KRII for hourly data and find peak
        let maxKrii = 0;
        let peakIndex = 0;

        for (let i = 0; i < hourly.length; i++) {
          const hour = hourly[i];
          const hourDate = new Date(hour.time);

          const env: EnvironmentSnapshot = {
            id: '',
            event_id: '',
            recorded_at: hour.time,
            lat,
            lon,
            pressure: hour.pressure,
            pressure_trend: null,
            pressure_change_6h: null,
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
            uv_index: 0,
            air_quality_pm25: hour.pm25,
            air_quality_no2: null,
            air_quality_ozone: null,
            hour_of_day: hourDate.getHours(),
            season: getSeason(hourDate),
            created_at: new Date().toISOString(),
          };

          const krii = calculateKRIIValue(env, null, chronotype);
          hourly[i].krii_value = krii.value;
          hourly[i].krii_level = krii.level;

          if (krii.value > maxKrii) {
            maxKrii = krii.value;
            peakIndex = i;
          }
        }

        setHourlyData(hourly);

        // Find peak in next 72 hours
        if (maxKrii > 0.5) {
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
              uv_index: 0,
              air_quality_pm25: hourly[peakIndex].pm25,
              air_quality_no2: null,
              air_quality_ozone: null,
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
            triggers: krii.primaryTriggers,
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Lädt Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">🧠 MigraineCast</h1>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 rounded text-white hover:bg-slate-700 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/journal"
              className="px-4 py-2 rounded text-gray-400 hover:text-white transition"
            >
              Tagebuch
            </Link>
            <Link
              href="/analysis"
              className="px-4 py-2 rounded text-gray-400 hover:text-white transition"
            >
              Analyse
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 rounded text-gray-400 hover:text-white transition"
            >
              Einstellungen
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Open Migraine Events Alert */}
        {openEvents.length > 0 && (
          <div className="mb-6 bg-blue-900 border border-blue-700 rounded-lg p-4">
            <p className="text-blue-200 font-medium">
              ℹ️ Sie haben {openEvents.length} offene Migräneereignis(se).
              Besuchen Sie das{' '}
              <Link href="/journal" className="underline hover:opacity-80">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <MigraineIndicator kriiValue={kriiValue} riskLevel={riskLevel} />
          {weatherData && (
            <WeatherSummary
              temperature={weatherData.current.temperature}
              humidity={weatherData.current.relative_humidity}
              windSpeed={weatherData.current.wind_speed}
              pressure={weatherData.current.pressure_msl}
              uvIndex={0}
              pm25={null}
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
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
