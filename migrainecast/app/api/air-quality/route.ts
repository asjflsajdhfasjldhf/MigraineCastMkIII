// API route for air quality data
import { getCurrentAirQuality, getHourlyAirQuality } from '@/lib/air-quality';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '52.52');
    const lon = parseFloat(searchParams.get('lon') || '13.405');
    const type = searchParams.get('type') || 'current'; // current, hourly

    if (type === 'current') {
      const aqData = await getCurrentAirQuality(lat, lon);
      return NextResponse.json(aqData);
    } else if (type === 'hourly') {
      const aqData = await getHourlyAirQuality(lat, lon);
      return NextResponse.json(aqData);
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Air quality API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch air quality data' },
      { status: 500 }
    );
  }
}
