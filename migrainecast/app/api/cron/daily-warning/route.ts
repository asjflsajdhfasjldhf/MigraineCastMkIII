// Cron job: Daily migraine risk warning (runs at 8:00 UTC)
import { NextRequest, NextResponse } from 'next/server';
import { getHourlyForecast, getHistoricalWeather } from '@/lib/weather';
import { getHourlyAirQuality } from '@/lib/air-quality';
import { calculateKRII } from '@/lib/krii';
import { KRII_CONFIG } from '@/lib/krii-config';
import { sendDailyWarningEmail } from '@/lib/email';
import { getUserSettings } from '@/lib/supabase';
import { EnvironmentSnapshot } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user settings
    const userSettings = await getUserSettings();
    const lat = parseFloat(userSettings.location_lat);
    const lon = parseFloat(userSettings.location_lon);
    const locationName = userSettings.location_name;
    const email = 'jbrylla@icloud.com'; // Hardcoded email
    const chronotype = userSettings.chronotype;
    const emailNotifications = userSettings.email_notifications === 'true';

    if (!emailNotifications) {
      return NextResponse.json({
        success: true,
        message: 'Email notifications disabled',
      });
    }

    // Fetch 72-hour forecast
    const hourlyForecast = await getHourlyForecast(lat, lon);
    const aqData = await getHourlyAirQuality(lat, lon);

    // Get historical data for pressure lag features
    const now = new Date();
    const historicalData = await getHistoricalWeather(lat, lon, now);

    // Calculate KRII for each hour in the forecast
    const kriiScores = [];

    for (let i = 0; i < Math.min(72, hourlyForecast.length); i++) {
      const forecast = hourlyForecast[i];
      const forecastTime = new Date(forecast.time);
      const hour = forecastTime.getHours();

      // Create environment snapshot
      const env: EnvironmentSnapshot = {
        id: '', // Not needed for calculation
        event_id: '', // Not needed for calculation
        recorded_at: forecast.time,
        lat,
        lon,
        pressure: forecast.pressure || null,
        pressure_trend: null,
        pressure_change_6h: null,
        pressure_change_24h: null,
        pressure_6h_ago: historicalData.pressure_6h_ago,
        pressure_12h_ago: historicalData.pressure_12h_ago,
        pressure_24h_ago: historicalData.pressure_24h_ago,
        pressure_48h_ago: historicalData.pressure_48h_ago,
        temperature: forecast.temperature || null,
        temperature_absolute: forecast.temperature || null,
        temp_change_6h: null,
        humidity: forecast.humidity || null,
        wind_speed: forecast.wind_speed || null,
        uv_index:
          aqData.uv_index[i] ||
          null,
        air_quality_pm25: aqData.pm25[i] || null,
        air_quality_no2: aqData.no2[i] || null,
        air_quality_ozone: aqData.ozone[i] || null,
        hour_of_day: hour,
        season: getSeason(forecastTime),
        created_at: new Date().toISOString(),
      };

      const krii = calculateKRII(env, null, chronotype);
      kriiScores.push({
        index: i,
        time: forecast.time,
        hour: hour,
        krii: krii.value,
        level: krii.level,
        triggers: krii.primaryTriggers,
      });
    }

    // Find peak KRII
    const peakScore = kriiScores.reduce((max, score) =>
      score.krii > max.krii ? score : max
    );

    // Only send email if peak KRII > 50%
    if (peakScore.krii > 0.5) {
      const peakHour = new Date(peakScore.time).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const peakDate = new Date(peakScore.time).toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      const peakForecast = hourlyForecast[peakScore.index];
      const pressureDelta6h =
        peakScore.index >= 6
          ? peakForecast.pressure - hourlyForecast[peakScore.index - 6].pressure
          : null;

      const triggerDetails = [
        pressureDelta6h !== null
          ? `Luftdruck: ${pressureDelta6h >= 0 ? '+' : ''}${pressureDelta6h.toFixed(1)} hPa in 6h (Schwellenwert: ±${KRII_CONFIG.thresholds.pressure_6h} hPa)`
          : null,
        `Temperatur: ${peakForecast.temperature.toFixed(1)} °C (Schwellenwert hoch: ${KRII_CONFIG.thresholds.temp_absolute_high} °C)`,
        `Luftfeuchtigkeit: ${peakForecast.humidity.toFixed(0)} %`,
        `Wind: ${peakForecast.wind_speed.toFixed(1)} km/h (Schwellenwert: ${KRII_CONFIG.thresholds.wind_critical} km/h)`,
        aqData.pm25[peakScore.index] !== undefined
          ? `PM2.5: ${aqData.pm25[peakScore.index].toFixed(1)} µg/m³ (Schwellenwert: ${KRII_CONFIG.thresholds.pm25_critical} µg/m³)`
          : null,
        aqData.no2[peakScore.index] !== undefined
          ? `NO2: ${aqData.no2[peakScore.index].toFixed(1)} µg/m³`
          : null,
        aqData.ozone[peakScore.index] !== undefined
          ? `Ozon: ${aqData.ozone[peakScore.index].toFixed(1)} µg/m³`
          : null,
      ].filter((value): value is string => Boolean(value));

      // Generate recommendation based on triggers
      let recommendation = 'Triptan bereithalten. Bildschirmzeit reduzieren.';
      if (pressureDelta6h !== null && pressureDelta6h <= -KRII_CONFIG.thresholds.pressure_6h) {
        recommendation += ' Ruhefenster in den naechsten 6 Stunden einplanen.';
      }
      if ((aqData.pm25[peakScore.index] ?? 0) >= KRII_CONFIG.thresholds.pm25_critical) {
        recommendation += ' Aussenbelastung und intensive Aktivitaet begrenzen.';
      }

      await sendDailyWarningEmail(email, {
        date: peakDate,
        peak_krii: peakScore.krii,
        peak_hour: peakHour,
        trigger_details: triggerDetails.slice(0, 3),
        recommendation,
      });

      return NextResponse.json({
        success: true,
        message: 'Warning email sent',
        peak_krii: peakScore.krii,
        peak_hour: peakHour,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No warning needed - KRII below threshold',
      peak_krii: peakScore.krii,
    });
  } catch (error) {
    console.error('Daily warning cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process daily warning' },
      { status: 500 }
    );
  }
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
