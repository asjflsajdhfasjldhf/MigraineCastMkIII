// API route for weather data
import { getCurrentWeather, getHourlyForecast, getDailyForecast, getHistoricalWeather } from '@/lib/weather';
import { getCurrentAirQuality, getHourlyAirQuality } from '@/lib/air-quality';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '52.52');
    const lon = parseFloat(searchParams.get('lon') || '13.405');
    const type = searchParams.get('type') || 'current'; // current, hourly, daily, combined

    if (type === 'current') {
      const weather = await getCurrentWeather(lat, lon);
      return NextResponse.json(weather);
    } else if (type === 'hourly') {
      const forecast = await getHourlyForecast(lat, lon);
      return NextResponse.json(forecast);
    } else if (type === 'daily') {
      const forecast = await getDailyForecast(lat, lon);
      return NextResponse.json(forecast);
    } else if (type === 'historical') {
      const date = new Date(searchParams.get('date') || new Date().toISOString());
      const historical = await getHistoricalWeather(lat, lon, date);
      return NextResponse.json(historical);
    } else if (type === 'combined') {
      const [current, hourly, daily, aqCurrent, aqHourly] = await Promise.all([
        getCurrentWeather(lat, lon),
        getHourlyForecast(lat, lon),
        getDailyForecast(lat, lon),
        getCurrentAirQuality(lat, lon),
        getHourlyAirQuality(lat, lon),
      ]);

      const mergedHourly = hourly.map((hour, index) => ({
        ...hour,
        uv_index: aqHourly.uv_index[index] ?? hour.uv_index ?? null,
        pm25: aqHourly.pm25[index] ?? hour.pm25 ?? null,
        no2: aqHourly.no2[index] ?? null,
        ozone: aqHourly.ozone[index] ?? null,
      }));

      return NextResponse.json({
        current: {
          ...current.current,
          ...aqCurrent,
        },
        hourly: mergedHourly,
        daily,
        aqHourly,
      });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
