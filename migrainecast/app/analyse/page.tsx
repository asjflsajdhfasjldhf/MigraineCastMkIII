'use client';

import { useEffect, useMemo, useState } from 'react';
import { CorrelationTable } from '@/components/analysis/CorrelationTable';
import { LagAnalysis } from '@/components/analysis/LagAnalysis';
import { NeurodivergenceChart } from '@/components/analysis/NeurodivergenceChart';
import { SeverityChart } from '@/components/analysis/SeverityChart';
import { EventDetail } from '@/components/journal/EventDetail';
import { JournalList } from '@/components/journal/JournalList';
import { getMigraineEvent, getMigraineEvents, supabase } from '@/lib/supabase';
import {
  EnvironmentSnapshot,
  Medication,
  MigraineEvent,
  PersonalFactors,
} from '@/types';

type AnalyseTab = 'history' | 'analysis';

type EnvRow = {
  event_id: string;
  pressure: number | null;
  pressure_trend: 'falling' | 'stable' | 'rising' | null;
  pressure_change_6h: number | null;
  pressure_change_24h: number | null;
  pressure_6h_ago: number | null;
  pressure_12h_ago: number | null;
  pressure_24h_ago: number | null;
  pressure_48h_ago: number | null;
  temperature: number | null;
  temp_change_6h: number | null;
  humidity: number | null;
  wind_speed: number | null;
  uv_index: number | null;
  air_quality_pm25: number | null;
  season: string | null;
};

type MedicationRow = {
  event_id: string;
  name: string;
  effectiveness: number | null;
};

type PersonalRow = {
  event_id: string;
  sensory_overload: number | null;
  masking_intensity: number | null;
  social_exhaustion: number | null;
  overstimulation: number | null;
};

type CorrelationRow = {
  factor: string;
  correlation: number;
  frequency: number;
};

type NeuroRow = {
  factor: string;
  correlation: number;
  averageScore: number;
};

type LagPoint = {
  hourBefore: number;
  averagePressureChange: number;
  frequency: number;
};

const toLocalDateKey = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCalendarSeverityBackground = (severity: number | null): string => {
  if (severity === null) return 'rgba(255, 255, 255, 0.02)';
  if (severity <= 4) return 'rgba(248, 113, 113, 0.20)';
  if (severity <= 7) return 'rgba(248, 113, 113, 0.38)';
  return 'rgba(248, 113, 113, 0.58)';
};

const countNonNull = <T,>(values: Array<T | null | undefined>) =>
  values.filter((value) => value !== null && value !== undefined).length;

const difference = (a: number | null, b: number | null): number | null => {
  if (a === null || b === null) return null;
  const value = a - b;
  return Number.isFinite(value) ? value : null;
};

const firstFinite = (...values: Array<number | null>): number | null => {
  for (const value of values) {
    if (value !== null && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
};

const resolvePressureMetrics = (row: EnvRow) => {
  const delta6 = firstFinite(
    row.pressure_change_6h,
    difference(row.pressure, row.pressure_6h_ago),
    difference(row.pressure_6h_ago, row.pressure_12h_ago),
    difference(row.pressure_12h_ago, row.pressure_24h_ago)
  );

  const delta12 = firstFinite(
    difference(row.pressure, row.pressure_12h_ago),
    difference(row.pressure_6h_ago, row.pressure_24h_ago),
    difference(row.pressure_12h_ago, row.pressure_24h_ago)
  );

  const delta24 = firstFinite(
    row.pressure_change_24h,
    difference(row.pressure, row.pressure_24h_ago),
    difference(row.pressure_24h_ago, row.pressure_48h_ago)
  );

  return { delta6, delta12, delta24 };
};

const formatGap = (hours: number | null) => {
  if (hours === null || !Number.isFinite(hours)) return '—';
  if (hours >= 48) return `${Math.round(hours / 24)} Tage`;
  if (hours >= 24) return `${(hours / 24).toFixed(1)} Tage`;
  return `${Math.round(hours)} Std.`;
};

export default function AnalysePage() {
  const [activeTab, setActiveTab] = useState<AnalyseTab>('history');
  const [events, setEvents] = useState<MigraineEvent[]>([]);
  const [envRows, setEnvRows] = useState<EnvRow[]>([]);
  const [medRows, setMedRows] = useState<MedicationRow[]>([]);
  const [personalRows, setPersonalRows] = useState<PersonalRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{
    event: MigraineEvent;
    medications: Medication[];
    environment: EnvironmentSnapshot | null;
    personal: PersonalFactors | null;
  } | null>(null);
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const fetchedEvents = await getMigraineEvents();
        console.log('[Analyse] migraine_events loaded:', fetchedEvents.length, fetchedEvents);

        setEvents(fetchedEvents);
        if (fetchedEvents.length > 0) {
          setSelectedEventId((current) => current || fetchedEvents[0].id);

          const newestTimestamp = fetchedEvents.reduce((latest, event) => {
            const ts = Date.parse(event.started_at);
            return Number.isFinite(ts) && ts > latest ? ts : latest;
          }, Number.NEGATIVE_INFINITY);

          if (Number.isFinite(newestTimestamp)) {
            const newestDate = new Date(newestTimestamp);
            setVisibleMonthDate(new Date(newestDate.getFullYear(), newestDate.getMonth(), 1));
          }
        }

        const eventIds = fetchedEvents.map((event) => event.id);

        const [envResult, medsResult, personalResult, envLimitResult, joinPreviewResult] =
          await Promise.all([
            eventIds.length > 0
              ? supabase.from('environment_snapshots').select('*').in('event_id', eventIds)
              : Promise.resolve({ data: [], error: null }),
            eventIds.length > 0
              ? supabase.from('medications').select('event_id, name, effectiveness').in('event_id', eventIds)
              : Promise.resolve({ data: [], error: null }),
            eventIds.length > 0
              ? supabase
                  .from('personal_factors')
                  .select('event_id, sensory_overload, masking_intensity, social_exhaustion, overstimulation')
                  .in('event_id', eventIds)
              : Promise.resolve({ data: [], error: null }),
            supabase.from('environment_snapshots').select('*').limit(5),
            supabase
              .from('migraine_events')
              .select('*, environment_snapshots(*)')
              .order('started_at', { ascending: false })
              .limit(5),
          ]);

        console.log('[Analyse] SELECT * FROM environment_snapshots LIMIT 5', envLimitResult.error || envLimitResult.data);
        console.log('[Analyse] LEFT JOIN migraine_events -> environment_snapshots LIMIT 5', joinPreviewResult.error || joinPreviewResult.data);

        if (envResult.error) {
          console.error('[Analyse] environment_snapshots query failed:', envResult.error);
        }
        if (medsResult.error) {
          console.error('[Analyse] medications query failed:', medsResult.error);
        }
        if (personalResult.error) {
          console.error('[Analyse] personal_factors query failed:', personalResult.error);
        }

        const loadedEnvRows = (envResult.data || []) as EnvRow[];
        const loadedMedRows = (medsResult.data || []) as MedicationRow[];
        const loadedPersonalRows = (personalResult.data || []) as PersonalRow[];
        const eventIdSet = new Set(eventIds);
        const envIdSet = new Set(loadedEnvRows.map((row) => row.event_id));

        console.log('[Analyse] JOIN diagnostics', {
          migraineEvents: eventIds.length,
          environmentSnapshotsMatched: loadedEnvRows.length,
          matchedEventIds: eventIds.filter((id) => envIdSet.has(id)).length,
          missingSnapshotEventIds: eventIds.filter((id) => !envIdSet.has(id)).slice(0, 10),
          orphanSnapshotEventIds: loadedEnvRows
            .map((row) => row.event_id)
            .filter((id) => !eventIdSet.has(id))
            .slice(0, 10),
        });

        console.log('[Analyse] pressure field population', {
          pressure: countNonNull(loadedEnvRows.map((row) => row.pressure)),
          pressure_change_6h: countNonNull(loadedEnvRows.map((row) => row.pressure_change_6h)),
          pressure_6h_ago: countNonNull(loadedEnvRows.map((row) => row.pressure_6h_ago)),
          pressure_12h_ago: countNonNull(loadedEnvRows.map((row) => row.pressure_12h_ago)),
          pressure_24h_ago: countNonNull(loadedEnvRows.map((row) => row.pressure_24h_ago)),
          pressure_48h_ago: countNonNull(loadedEnvRows.map((row) => row.pressure_48h_ago)),
        });

        const manualJoinPreview = fetchedEvents.slice(0, 5).map((event) => ({
          migraine_event: event,
          environment_snapshots: loadedEnvRows.filter((row) => row.event_id === event.id),
        }));
        console.log('[Analyse] manual LEFT JOIN preview', manualJoinPreview);

        setEnvRows(loadedEnvRows);
        setMedRows(loadedMedRows);
        setPersonalRows(loadedPersonalRows);
        setErrorMessage(null);
      } catch (error) {
        console.error('[Analyse] Error loading page:', error);
        setErrorMessage('Analyse- und Verlaufsdaten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadSelectedEvent = async () => {
      if (!selectedEventId) {
        setSelectedEvent(null);
        return;
      }

      try {
        const event = await getMigraineEvent(selectedEventId);
        setSelectedEvent(event);
      } catch (error) {
        console.error('[Analyse] Error loading selected event:', error);
      }
    };

    loadSelectedEvent();
  }, [selectedEventId]);

  const timelineEvents = useMemo(
    () => events.filter((event) => Boolean(event.started_at)),
    [events]
  );

  const historyStats = useMemo(() => {
    if (timelineEvents.length === 0) {
      return {
        lastAttackDateLabel: null as string | null,
        thisMonthCount: 0,
        avgPerMonth: 0,
        longestGapHours: null as number | null,
      };
    }

    const sortedAsc = [...timelineEvents].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );
    const newest = sortedAsc[sortedAsc.length - 1];
    const newestDate = new Date(newest.started_at);
    const now = new Date();

    const lastAttackDateLabel = newestDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const thisMonthCount = timelineEvents.filter((event) => {
      const d = new Date(event.started_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const byMonth = new Map<string, number>();
    timelineEvents.forEach((event) => {
      const d = new Date(event.started_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      byMonth.set(key, (byMonth.get(key) || 0) + 1);
    });

    let longestGapHours: number | null = null;
    for (let index = 1; index < sortedAsc.length; index++) {
      const prev = new Date(sortedAsc[index - 1].started_at).getTime();
      const next = new Date(sortedAsc[index].started_at).getTime();
      const diffHours = (next - prev) / (1000 * 60 * 60);
      if (longestGapHours === null || diffHours > longestGapHours) {
        longestGapHours = diffHours;
      }
    }

    return {
      lastAttackDateLabel,
      thisMonthCount,
      avgPerMonth:
        byMonth.size > 0
          ? Array.from(byMonth.values()).reduce((sum, value) => sum + value, 0) / byMonth.size
          : 0,
      longestGapHours,
    };
  }, [timelineEvents]);

  const triggerStats = useMemo(() => {
    if (timelineEvents.length === 0 || envRows.length === 0) {
      return [] as Array<{ name: string; pct: number }>;
    }

    const counter = new Map<string, number>();

    envRows.forEach((row) => {
      const metrics = resolvePressureMetrics(row);
      if (metrics.delta6 !== null && metrics.delta6 <= -1) {
        counter.set('Fallender Luftdruck', (counter.get('Fallender Luftdruck') || 0) + 1);
      }
      if (metrics.delta24 !== null && Math.abs(metrics.delta24) >= 4) {
        counter.set('Starker Druckwechsel', (counter.get('Starker Druckwechsel') || 0) + 1);
      }
      if (Math.abs(row.temp_change_6h ?? 0) >= 5) {
        counter.set('Temperatursprung', (counter.get('Temperatursprung') || 0) + 1);
      }
      if ((row.air_quality_pm25 ?? 0) >= 25) {
        counter.set('Erhoehte PM2.5', (counter.get('Erhoehte PM2.5') || 0) + 1);
      }
    });

    return Array.from(counter.entries())
      .map(([name, count]) => ({
        name,
        pct: (count / timelineEvents.length) * 100,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [timelineEvents, envRows]);

  const symptomStats = useMemo(() => {
    const counter = new Map<string, number>();

    timelineEvents.forEach((event) => {
      const symptoms = Array.isArray(event.symptoms) ? event.symptoms : [];
      symptoms.forEach((symptom) => {
        counter.set(symptom, (counter.get(symptom) || 0) + 1);
      });
    });

    return Array.from(counter.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [timelineEvents]);

  const medicationStats = useMemo(() => {
    const grouped = new Map<string, { sum: number; count: number }>();

    medRows.forEach((row) => {
      if (row.effectiveness === null) return;
      const current = grouped.get(row.name) || { sum: 0, count: 0 };
      grouped.set(row.name, {
        sum: current.sum + row.effectiveness,
        count: current.count + 1,
      });
    });

    return Array.from(grouped.entries())
      .map(([name, data]) => ({
        name,
        avg: data.count > 0 ? data.sum / data.count : 0,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [medRows]);

  const neurodivAvg = useMemo(() => {
    if (personalRows.length === 0) return null;

    const values = personalRows
      .map((row) => {
        const parts = [
          row.sensory_overload,
          row.masking_intensity,
          row.social_exhaustion,
          row.overstimulation,
        ].filter((value): value is number => value !== null);
        if (parts.length === 0) return null;
        return parts.reduce((sum, value) => sum + value, 0) / parts.length;
      })
      .filter((value): value is number => value !== null);

    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [personalRows]);

  const calendarData = useMemo(() => {
    const year = visibleMonthDate.getFullYear();
    const month = visibleMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const byDate = new Map<string, MigraineEvent[]>();
    timelineEvents.forEach((event) => {
      const dateKey = toLocalDateKey(event.started_at);
      const list = byDate.get(dateKey) || [];
      list.push(event);
      byDate.set(dateKey, list);
    });

    const cells: Array<{ date: string | null; severity: number | null; count: number }> = [];

    for (let index = 0; index < startOffset; index++) {
      cells.push({ date: null, severity: null, count: 0 });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = toLocalDateKey(date);
      const entries = byDate.get(key) || [];
      const maxSeverity = entries.length > 0 ? Math.max(...entries.map((entry) => entry.severity)) : null;

      cells.push({
        date: key,
        severity: maxSeverity,
        count: entries.length,
      });
    }

    return {
      monthLabel: visibleMonthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
      cells,
      byDate,
    };
  }, [timelineEvents, visibleMonthDate]);

  const selectedEntries = useMemo(() => {
    if (!selectedDate) return [] as MigraineEvent[];
    return calendarData.byDate.get(selectedDate) || [];
  }, [calendarData, selectedDate]);

  const earliestMonthDate = useMemo(() => {
    if (timelineEvents.length === 0) return null;
    const earliest = timelineEvents.reduce((acc, event) => {
      const current = new Date(event.started_at).getTime();
      return current < acc ? current : acc;
    }, Number.POSITIVE_INFINITY);
    const earliestDate = new Date(earliest);
    return new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
  }, [timelineEvents]);

  const canGoPrevMonth = useMemo(() => {
    if (!earliestMonthDate) return false;
    return (
      visibleMonthDate.getFullYear() > earliestMonthDate.getFullYear() ||
      (visibleMonthDate.getFullYear() === earliestMonthDate.getFullYear() &&
        visibleMonthDate.getMonth() > earliestMonthDate.getMonth())
    );
  }, [earliestMonthDate, visibleMonthDate]);

  const canGoNextMonth = useMemo(() => {
    const now = new Date();
    return (
      visibleMonthDate.getFullYear() < now.getFullYear() ||
      (visibleMonthDate.getFullYear() === now.getFullYear() &&
        visibleMonthDate.getMonth() < now.getMonth())
    );
  }, [visibleMonthDate]);

  const monthlySeveritySeries = useMemo(() => {
    const grouped = new Map<string, { sum: number; count: number }>();

    timelineEvents.forEach((event) => {
      const date = new Date(event.started_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = grouped.get(key) || { sum: 0, count: 0 };
      grouped.set(key, { sum: current.sum + event.severity, count: current.count + 1 });
    });

    return Array.from(grouped.entries())
      .map(([month, value]) => ({ month, avg: value.sum / value.count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [timelineEvents]);

  const analysisStats = useMemo(() => {
    if (timelineEvents.length === 0) {
      return {
        totalEvents: 0,
        averageSeverity: 0,
        severityDistribution: [] as Array<{ severity: number; count: number }>,
        correlations: [] as CorrelationRow[],
        lagData: [] as LagPoint[],
        neurodivergence: [] as NeuroRow[],
        hasPersonalFactors: false,
      };
    }

    const severityMap: Record<number, number> = {};
    for (let severity = 1; severity <= 10; severity++) {
      severityMap[severity] = timelineEvents.filter((event) => event.severity === severity).length;
    }

    const severityDistribution = Object.entries(severityMap)
      .filter(([, count]) => count > 0)
      .map(([severity, count]) => ({ severity: Number(severity), count }));

    const averageSeverity =
      timelineEvents.reduce((sum, event) => sum + event.severity, 0) / timelineEvents.length;

    const symptomCounter = new Map<string, number>();
    timelineEvents.forEach((event) => {
      const symptoms = Array.isArray(event.symptoms) ? event.symptoms : [];
      symptoms.forEach((symptom) => {
        symptomCounter.set(symptom, (symptomCounter.get(symptom) || 0) + 1);
      });
    });

    const symptomCorrelations: CorrelationRow[] = Array.from(symptomCounter.entries()).map(
      ([factor, count]) => {
        const ratio = count / timelineEvents.length;
        return {
          factor: `Symptom: ${factor}`,
          correlation: Math.min(1, ratio),
          frequency: ratio * 100,
        };
      }
    );

    const envCorrelations: CorrelationRow[] = [];
    const pressure6Values = envRows
      .map((row) => resolvePressureMetrics(row).delta6)
      .filter((value): value is number => value !== null);
    const pressure24Values = envRows
      .map((row) => resolvePressureMetrics(row).delta24)
      .filter((value): value is number => value !== null);

    const pressureDrops = pressure6Values.filter((value) => value <= -1).length;
    if (pressureDrops > 0 && pressure6Values.length > 0) {
      envCorrelations.push({
        factor: 'Luftdruckabfall (≥1 hPa/6h)',
        correlation: pressureDrops / pressure6Values.length,
        frequency: (pressureDrops / pressure6Values.length) * 100,
      });
    }

    const strongPressureChange = pressure24Values.filter((value) => Math.abs(value) >= 4).length;
    if (strongPressureChange > 0 && pressure24Values.length > 0) {
      envCorrelations.push({
        factor: 'Starker Druckwechsel (≥4 hPa/24h)',
        correlation: strongPressureChange / pressure24Values.length,
        frequency: (strongPressureChange / pressure24Values.length) * 100,
      });
    }

    const highPressure = envRows.filter((row) => row.pressure !== null && row.pressure >= 1013).length;
    if (highPressure > 0) {
      envCorrelations.push({
        factor: 'Hoher Luftdruck (≥1013 hPa)',
        correlation: highPressure / envRows.length,
        frequency: (highPressure / envRows.length) * 100,
      });
    }

    const lowPressure = envRows.filter((row) => row.pressure !== null && row.pressure < 1000).length;
    if (lowPressure > 0) {
      envCorrelations.push({
        factor: 'Niedriger Luftdruck (<1000 hPa)',
        correlation: lowPressure / envRows.length,
        frequency: (lowPressure / envRows.length) * 100,
      });
    }

    const tempChange = envRows.filter((row) => row.temp_change_6h !== null && Math.abs(row.temp_change_6h) >= 3).length;
    if (tempChange > 0) {
      envCorrelations.push({
        factor: 'Temperaturwechsel (≥3°C/6h)',
        correlation: tempChange / envRows.length,
        frequency: (tempChange / envRows.length) * 100,
      });
    }

    const highHumidity = envRows.filter((row) => row.humidity !== null && row.humidity >= 80).length;
    if (highHumidity > 0) {
      envCorrelations.push({
        factor: 'Hohe Luftfeuchte (≥80%)',
        correlation: highHumidity / envRows.length,
        frequency: (highHumidity / envRows.length) * 100,
      });
    }

    const highUv = envRows.filter((row) => row.uv_index !== null && row.uv_index >= 7).length;
    if (highUv > 0) {
      envCorrelations.push({
        factor: 'Hohe UV-Belastung (≥7)',
        correlation: highUv / envRows.length,
        frequency: (highUv / envRows.length) * 100,
      });
    }

    const highWind = envRows.filter((row) => row.wind_speed !== null && row.wind_speed >= 40).length;
    if (highWind > 0) {
      envCorrelations.push({
        factor: 'Starker Wind (≥40 km/h)',
        correlation: highWind / envRows.length,
        frequency: (highWind / envRows.length) * 100,
      });
    }

    const poorAirQuality = envRows.filter((row) => row.air_quality_pm25 !== null && row.air_quality_pm25 >= 35).length;
    if (poorAirQuality > 0) {
      envCorrelations.push({
        factor: 'Hohe PM2.5 (≥35 µg/m³)',
        correlation: poorAirQuality / envRows.length,
        frequency: (poorAirQuality / envRows.length) * 100,
      });
    }

    const lagDefinitions: Array<{ hourBefore: number; pick: (row: EnvRow) => number | null }> = [
      { hourBefore: 6, pick: (row) => resolvePressureMetrics(row).delta6 },
      { hourBefore: 12, pick: (row) => resolvePressureMetrics(row).delta12 },
      { hourBefore: 24, pick: (row) => resolvePressureMetrics(row).delta24 },
    ];

    const lagData = lagDefinitions
      .map((definition) => {
        const values = envRows
          .map((row) => definition.pick(row))
          .filter((value): value is number => value !== null);

        if (values.length === 0) return null;

        return {
          hourBefore: definition.hourBefore,
          averagePressureChange: values.reduce((sum, value) => sum + value, 0) / values.length,
          frequency: (values.length / envRows.length) * 100,
        };
      })
      .filter((row): row is LagPoint => row !== null);

    const neuroDefs: Array<{
      factor: string;
      key: keyof Pick<
        PersonalRow,
        'sensory_overload' | 'masking_intensity' | 'social_exhaustion' | 'overstimulation'
      >;
    }> = [
      { factor: 'Sensorische Überlastung', key: 'sensory_overload' },
      { factor: 'Masking-Intensität', key: 'masking_intensity' },
      { factor: 'Soziale Erschöpfung', key: 'social_exhaustion' },
      { factor: 'Überstimulation', key: 'overstimulation' },
    ];

    const neurodivergence = neuroDefs
      .map((definition) => {
        const values = personalRows
          .map((row) => row[definition.key])
          .filter((value): value is number => value !== null);

        if (values.length === 0) return null;

        const averageScore = values.reduce((sum, value) => sum + value, 0) / values.length;
        return {
          factor: definition.factor,
          averageScore,
          correlation: Math.min(1, averageScore / 5),
        };
      })
      .filter((row): row is NeuroRow => row !== null);

    const correlations = [...symptomCorrelations, ...envCorrelations]
      .sort((a, b) => b.correlation - a.correlation)
      .slice(0, 10);

    console.log('[Analyse] computed analysis data', {
      symptomCorrelations,
      envCorrelations,
      lagData,
      neurodivergence,
      totalEvents: timelineEvents.length,
      totalEnvRows: envRows.length,
    });

    return {
      totalEvents: timelineEvents.length,
      averageSeverity,
      severityDistribution,
      correlations,
      lagData,
      neurodivergence,
      hasPersonalFactors: personalRows.length > 0 && neurodivergence.length > 0,
    };
  }, [envRows, personalRows, timelineEvents]);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white/40 rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Lade Analyse...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-main max-w-6xl mx-auto dashboard-container py-8 space-y-6">
        {errorMessage && (
          <section className="glass-card p-4 border border-[var(--accent-high)]">
            <p className="text-sm text-[var(--text-primary)]">{errorMessage}</p>
          </section>
        )}

        <section className="glass-card p-3 md:p-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`ui-button ${activeTab === 'history' ? 'border-[var(--accent-low)] text-white' : ''}`}
            >
              Verlauf
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analysis')}
              className={`ui-button ${activeTab === 'analysis' ? 'border-[var(--accent-medium)] text-white' : ''}`}
            >
              Analyse
            </button>
          </div>
        </section>

        {activeTab === 'history' ? (
          <>
            <section className="glass-card p-6">
              <h2 className="text-xl font-medium mb-4">Schnellstatistiken</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Letzte Attacke</p>
                  <p className="text-2xl font-medium">{historyStats.lastAttackDateLabel || '—'}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Dieser Monat</p>
                  <p className="text-2xl font-medium">{historyStats.thisMonthCount} Attacken</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Durchschnitt</p>
                  <p className="text-2xl font-medium">{historyStats.avgPerMonth.toFixed(1)} / Monat</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Längste migränefreie Phase</p>
                  <p className="text-2xl font-medium">{formatGap(historyStats.longestGapHours)}</p>
                </div>
              </div>
            </section>

            <section className="glass-card p-6">
              <h2 className="text-xl font-medium mb-4">Kalender</h2>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  className="ui-button"
                  disabled={!canGoPrevMonth}
                  onClick={() => {
                    if (!canGoPrevMonth) return;
                    const prev = new Date(visibleMonthDate);
                    prev.setMonth(prev.getMonth() - 1);
                    setVisibleMonthDate(new Date(prev.getFullYear(), prev.getMonth(), 1));
                  }}
                >
                  ←
                </button>
                <p className="text-sm text-[var(--text-secondary)]">{calendarData.monthLabel}</p>
                <button
                  type="button"
                  className="ui-button"
                  disabled={!canGoNextMonth}
                  onClick={() => {
                    if (!canGoNextMonth) return;
                    const next = new Date(visibleMonthDate);
                    next.setMonth(next.getMonth() + 1);
                    setVisibleMonthDate(new Date(next.getFullYear(), next.getMonth(), 1));
                  }}
                >
                  →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-xs mb-2 text-[var(--text-secondary)]">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                  <div key={day} className="text-center">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarData.cells.map((cell, index) => {
                  const isSelected = cell.date && selectedDate === cell.date;
                  const today = toLocalDateKey(new Date());
                  const isToday = cell.date === today;

                  return (
                    <button
                      key={`${cell.date || 'empty'}-${index}`}
                      type="button"
                      disabled={!cell.date}
                      onClick={() => cell.date && setSelectedDate(cell.date)}
                      className="h-12 rounded-lg border text-center disabled:opacity-20 relative"
                      style={{
                        borderColor: isSelected
                          ? 'var(--accent-medium)'
                          : isToday
                            ? 'var(--text-primary)'
                            : 'rgba(255, 255, 255, 0.08)',
                        background: cell.severity
                          ? getCalendarSeverityBackground(cell.severity)
                          : cell.count > 0
                            ? 'rgba(248, 113, 113, 0.28)'
                            : getCalendarSeverityBackground(null),
                      }}
                    >
                      {cell.date ? Number(cell.date.slice(-2)) : ''}
                    </button>
                  );
                })}
              </div>

              {selectedEntries.length > 0 && (
                <div className="mt-4 p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                  <p className="text-sm text-[var(--text-secondary)]">Details für {selectedDate}</p>
                  {selectedEntries.map((event) => (
                    <div key={event.id} className="text-sm border-t border-white/10 pt-2">
                      <p>
                        Start:{' '}
                        {new Date(event.started_at).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p>Schweregrad: {event.severity}/10</p>
                      <p className="truncate">Notiz: {event.notes || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="glass-card p-6">
              <h2 className="text-xl font-medium mb-4">Woran lag es meistens</h2>

              {envRows.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Keine Umweltdaten verfügbar.</p>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">Top-Trigger</p>
                    <div className="space-y-2">
                      {triggerStats.map((item) => (
                        <div key={item.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{item.name}</span>
                            <span>{item.pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 rounded bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent-high)]"
                              style={{ width: `${Math.min(item.pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {triggerStats.length === 0 && (
                        <p className="text-sm text-[var(--text-secondary)]">Keine Triggerdaten verfügbar</p>
                      )}
                    </div>
                  </div>

                  {monthlySeveritySeries.length > 1 && (
                    <div>
                      <p className="text-sm text-[var(--text-secondary)] mb-2">
                        Durchschnittlicher Schweregrad pro Monat
                      </p>
                      <svg viewBox="0 0 320 120" className="w-full h-32 rounded-lg border border-white/10 bg-white/[0.02]">
                        {monthlySeveritySeries.map((point, index) => {
                          const x = (index / (monthlySeveritySeries.length - 1)) * 300 + 10;
                          const y = 110 - ((point.avg - 1) / 9) * 90;
                          const next = monthlySeveritySeries[index + 1];
                          if (!next) {
                            return <circle key={point.month} cx={x} cy={y} r="3" fill="var(--accent-medium)" />;
                          }
                          const nextX = ((index + 1) / (monthlySeveritySeries.length - 1)) * 300 + 10;
                          const nextY = 110 - ((next.avg - 1) / 9) * 90;
                          return (
                            <g key={point.month}>
                              <line x1={x} y1={y} x2={nextX} y2={nextY} stroke="var(--accent-medium)" strokeWidth="2" />
                              <circle cx={x} cy={y} r="3" fill="var(--accent-medium)" />
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-4">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Neurodivergenz-Durchschnitt</p>
                      <p className="text-2xl font-medium">{neurodivAvg !== null ? `${neurodivAvg.toFixed(2)} / 5` : '—'}</p>
                    </div>

                    <div className="glass-card p-4">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Häufigste Symptome</p>
                      <ul className="text-sm space-y-1">
                        {symptomStats.slice(0, 3).map((entry) => (
                          <li key={entry.name}>{entry.name}: {entry.count}</li>
                        ))}
                        {symptomStats.length === 0 && <li>—</li>}
                      </ul>
                    </div>

                    <div className="glass-card p-4">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">Wirksamste Medikamente</p>
                      <ul className="text-sm space-y-1">
                        {medicationStats.slice(0, 3).map((entry) => (
                          <li key={entry.name}>{entry.name}: {entry.avg.toFixed(2)} / 5</li>
                        ))}
                        {medicationStats.length === 0 && <li>—</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="glass-card p-6">
              <h2 className="text-xl font-medium mb-4">Ereignisse</h2>
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
                <div>
                  <JournalList events={timelineEvents} onSelectEvent={setSelectedEventId} />
                </div>
                <div>
                  {selectedEvent ? (
                    <EventDetail
                      event={selectedEvent.event}
                      medications={selectedEvent.medications}
                      environment={selectedEvent.environment}
                      personal={selectedEvent.personal}
                    />
                  ) : (
                    <div className="glass-card p-6 text-[var(--text-secondary)]">
                      Ereignis auswählen, um Details anzuzeigen.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <p className="text-[var(--text-secondary)] text-sm mb-2">Gesamtereignisse</p>
                <p className="text-4xl font-bold text-[var(--text-primary)] mono-value">{analysisStats.totalEvents}</p>
              </div>

              <div className="glass-card p-6">
                <p className="text-[var(--text-secondary)] text-sm mb-2">Ø Schweregrad</p>
                <p className="text-4xl font-bold text-[var(--text-primary)] mono-value">
                  {analysisStats.averageSeverity ? `${analysisStats.averageSeverity.toFixed(1)}/10` : '—'}
                </p>
              </div>
            </div>

            {analysisStats.severityDistribution.length > 0 && <SeverityChart data={analysisStats.severityDistribution} />}
            <CorrelationTable data={analysisStats.correlations} />
            <LagAnalysis data={analysisStats.lagData} />
            {analysisStats.hasPersonalFactors && <NeurodivergenceChart data={analysisStats.neurodivergence} />}
          </>
        )}
      </div>
    </div>
  );
}