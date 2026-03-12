import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type SnapshotInsert = {
  event_id: string;
  recorded_at: string;
  lat: number;
  lon: number;
  pressure: number | null;
  pressure_trend: 'falling' | 'stable' | 'rising' | null;
  pressure_change_6h: number | null;
  pressure_change_24h: number | null;
  pressure_6h_ago: number | null;
  pressure_12h_ago: number | null;
  pressure_24h_ago: number | null;
  pressure_48h_ago: number | null;
  temperature: number | null;
  temperature_absolute: number | null;
  temp_change_6h: number | null;
  humidity: number | null;
  wind_speed: number | null;
  uv_index: number | null;
  air_quality_pm25: number | null;
  air_quality_no2: number | null;
  air_quality_ozone: number | null;
  hour_of_day: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
};

interface ArchiveHourlyResponse {
  hourly?: {
    time: string[];
    pressure_msl?: number[];
    surface_pressure?: number[];
    temperature_2m: number[];
    relative_humidity_2m?: number[];
    relativehumidity_2m?: number[];
    wind_speed_10m?: number[];
    windspeed_10m?: number[];
    uv_index?: number[];
  };
}

const ARCHIVE_ENDPOINT = 'https://archive.open-meteo.com/v1/archive';

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const parseUtcHour = (value: string): number => {
  const ms = Date.parse(`${value}Z`);
  return Number.isFinite(ms) ? ms : Date.parse(value);
};

const findClosestIndex = (times: string[], targetMs: number): number => {
  let closestIndex = 0;
  let minDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < times.length; i++) {
    const currentMs = parseUtcHour(times[i]);
    const diff = Math.abs(currentMs - targetMs);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }

  return closestIndex;
};

const toNullableNumber = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toSeason = (month: number): 'spring' | 'summer' | 'autumn' | 'winter' => {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
};

const toPressureTrend = (change6h: number | null): 'falling' | 'stable' | 'rising' | null => {
  if (change6h === null) return null;
  if (change6h <= -1) return 'falling';
  if (change6h >= 1) return 'rising';
  return 'stable';
};

async function fetchSnapshotForEvent(
  lat: number,
  lon: number,
  startedAtIso: string,
  eventId: string
): Promise<SnapshotInsert> {
  const startedAt = new Date(startedAtIso);
  const startDate = new Date(startedAt.getTime() - 48 * 60 * 60 * 1000);
  const endDate = /^\d{4}-\d{2}-\d{2}/.test(startedAtIso)
    ? startedAtIso.slice(0, 10)
    : formatDate(startedAt);

  const hourlyCandidates = [
    'pressure_msl,temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index',
    'surface_pressure,temperature_2m,relativehumidity_2m,windspeed_10m,uv_index',
  ];

  let data: ArchiveHourlyResponse | null = null;
  let lastErrorDetail = 'Unknown historical weather error';

  for (const hourlyParam of hourlyCandidates) {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      start_date: formatDate(startDate),
      end_date: endDate,
      hourly: hourlyParam,
      timezone: 'GMT',
    });

    const requestUrl = `${ARCHIVE_ENDPOINT}?${params.toString()}`;

    try {
      const response = await fetch(requestUrl);
      if (!response.ok) {
        const errorBody = await response.text();
        lastErrorDetail = `status=${response.status}; hourly=${hourlyParam}; body=${errorBody.slice(0, 240)}`;
        continue;
      }

      const payload: ArchiveHourlyResponse = await response.json();
      if (!payload.hourly || payload.hourly.time.length === 0) {
        lastErrorDetail = `No hourly data returned; hourly=${hourlyParam}; event=${eventId}`;
        continue;
      }

      data = payload;
      break;
    } catch (error) {
      lastErrorDetail =
        `network/json error; hourly=${hourlyParam}; ` +
        (error instanceof Error ? error.message : 'Unknown error');
    }
  }

  if (!data || !data.hourly) {
    throw new Error(`Historical weather fetch failed for event ${eventId}: ${lastErrorDetail}`);
  }

  const pressureSeries = data.hourly.pressure_msl || data.hourly.surface_pressure || [];
  const humiditySeries = data.hourly.relative_humidity_2m || data.hourly.relativehumidity_2m || [];
  const windSeries = data.hourly.wind_speed_10m || data.hourly.windspeed_10m || [];

  const targetMs = startedAt.getTime();
  const idxNow = findClosestIndex(data.hourly.time, targetMs);
  const idx6h = findClosestIndex(data.hourly.time, targetMs - 6 * 60 * 60 * 1000);
  const idx12h = findClosestIndex(data.hourly.time, targetMs - 12 * 60 * 60 * 1000);
  const idx24h = findClosestIndex(data.hourly.time, targetMs - 24 * 60 * 60 * 1000);
  const idx48h = findClosestIndex(data.hourly.time, targetMs - 48 * 60 * 60 * 1000);

  const pressureNow = toNullableNumber(pressureSeries[idxNow]);
  const pressure6h = toNullableNumber(pressureSeries[idx6h]);
  const pressure12h = toNullableNumber(pressureSeries[idx12h]);
  const pressure24h = toNullableNumber(pressureSeries[idx24h]);
  const pressure48h = toNullableNumber(pressureSeries[idx48h]);

  const tempNow = toNullableNumber(data.hourly.temperature_2m[idxNow]);
  const temp6h = toNullableNumber(data.hourly.temperature_2m[idx6h]);

  const pressureChange6h =
    pressureNow !== null && pressure6h !== null ? pressureNow - pressure6h : null;
  const pressureChange24h =
    pressureNow !== null && pressure24h !== null ? pressureNow - pressure24h : null;
  const tempChange6h = tempNow !== null && temp6h !== null ? tempNow - temp6h : null;

  return {
    event_id: eventId,
    recorded_at: startedAtIso,
    lat,
    lon,
    pressure: pressureNow,
    pressure_trend: toPressureTrend(pressureChange6h),
    pressure_change_6h: pressureChange6h,
    pressure_change_24h: pressureChange24h,
    pressure_6h_ago: pressure6h,
    pressure_12h_ago: pressure12h,
    pressure_24h_ago: pressure24h,
    pressure_48h_ago: pressure48h,
    temperature: tempNow,
    temperature_absolute: tempNow,
    temp_change_6h: tempChange6h,
    humidity: toNullableNumber(humiditySeries[idxNow]),
    wind_speed: toNullableNumber(windSeries[idxNow]),
    uv_index: toNullableNumber(data.hourly.uv_index?.[idxNow]),
    air_quality_pm25: null,
    air_quality_no2: null,
    air_quality_ozone: null,
    hour_of_day: startedAt.getUTCHours(),
    season: toSeason(startedAt.getUTCMonth()),
  };
}

export async function POST() {
  const stream = new ReadableStream({
    start(controller) {
      const writeLine = (payload: Record<string, unknown>) => {
        controller.enqueue(`${JSON.stringify(payload)}\n`);
      };

      const run = async () => {
        try {
          const { data: settingsRows, error: settingsError } = await supabase
            .from('user_settings')
            .select('key, value')
            .in('key', ['location_lat', 'location_lon']);

          if (settingsError) {
            throw new Error(`Could not load location from user_settings: ${settingsError.message}`);
          }

          const settingsMap = new Map((settingsRows || []).map((row) => [row.key, row.value]));
          const lat = parseFloat(settingsMap.get('location_lat') || '52.52');
          const lon = parseFloat(settingsMap.get('location_lon') || '13.405');

          if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            throw new Error('location_lat/location_lon in user_settings are invalid');
          }

          const { data: events, error: eventsError } = await supabase
            .from('migraine_events')
            .select('id, started_at')
            .order('started_at', { ascending: true });

          if (eventsError) {
            throw new Error(`Could not load migraine_events: ${eventsError.message}`);
          }

          const { data: snapshots, error: snapshotsError } = await supabase
            .from('environment_snapshots')
            .select('event_id');

          if (snapshotsError) {
            throw new Error(`Could not load environment_snapshots: ${snapshotsError.message}`);
          }

          const existingEventIds = new Set((snapshots || []).map((row) => row.event_id));
          const missingEvents = (events || []).filter(
            (event) => !existingEventIds.has(event.id)
          );

          const total = missingEvents.length;
          let processed = 0;
          let success = 0;
          let failed = 0;

          writeLine({
            type: 'start',
            total,
            processed,
            success,
            failed,
          });

          for (const event of missingEvents) {
            try {
              const snapshot = await fetchSnapshotForEvent(lat, lon, event.started_at, event.id);
              const { error: insertError } = await supabase
                .from('environment_snapshots')
                .insert(snapshot);

              if (insertError) {
                throw new Error(insertError.message);
              }

              success += 1;
            } catch (error) {
              failed += 1;
              const errorText = error instanceof Error ? error.message : 'Unknown error';
              writeLine({
                type: 'event-error',
                eventId: event.id,
                error: errorText,
                details: [
                  `event_id=${event.id}`,
                  `started_at=${event.started_at}`,
                  `lat=${lat}`,
                  `lon=${lon}`,
                  `reason=${errorText}`,
                ].join(' | '),
              });
            } finally {
              processed += 1;
              writeLine({
                type: 'progress',
                total,
                processed,
                success,
                failed,
                eventId: event.id,
              });
            }
          }

          writeLine({
            type: 'done',
            total,
            processed,
            success,
            failed,
          });
          controller.close();
        } catch (error) {
          writeLine({
            type: 'fatal-error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.close();
        }
      };

      void run();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
