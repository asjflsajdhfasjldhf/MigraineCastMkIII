// Analysis Page
'use client';

import { useEffect, useState } from 'react';
import { CorrelationTable } from '@/components/analysis/CorrelationTable';
import { SeverityChart } from '@/components/analysis/SeverityChart';
import { LagAnalysis } from '@/components/analysis/LagAnalysis';
import { NeurodivergenceChart } from '@/components/analysis/NeurodivergenceChart';
import { getMigraineEvents, supabase } from '@/lib/supabase';

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

type AnalysisStats = {
  totalEvents: number;
  averageSeverity: number;
  severityDistribution: Array<{ severity: number; count: number }>;
  correlations: CorrelationRow[];
  lagData: Array<{ hourBefore: number; averagePressureChange: number; frequency: number }>;
  neurodivergence: NeuroRow[];
  hasPersonalFactors: boolean;
};

type PersonalFactorRow = {
  event_id: string;
  sleep_hours: number | null;
  stress_level: number | null;
  alcohol_yesterday: boolean | null;
  caffeine_withdrawal: boolean | null;
  hydration: number | null;
  sensory_overload: number | null;
  masking_intensity: number | null;
  social_exhaustion: number | null;
  overstimulation: number | null;
};

type EnvironmentSnapshotRow = {
  event_id: string;
  pressure: number | null;
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

export default function AnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalysisStats>({
    totalEvents: 0,
    averageSeverity: 0,
    severityDistribution: [],
    correlations: [],
    lagData: [],
    neurodivergence: [],
    hasPersonalFactors: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        console.log('[Analysis] Loading migraine events...');
        const fetchedEvents = await getMigraineEvents();
        console.log('[Analysis] Fetched events:', fetchedEvents.length, fetchedEvents);
        
        const eventsWithDate = fetchedEvents.filter((event) => Boolean(event.started_at));
        console.log('[Analysis] Events with date:', eventsWithDate.length);

        if (eventsWithDate.length === 0) {
          console.log('[Analysis] No events with dates found');
          setStats({
            totalEvents: 0,
            averageSeverity: 0,
            correlations: [],
            lagData: [],
            severityDistribution: [],
            neurodivergence: [],
            hasPersonalFactors: false,
          });
          setErrorMessage(null);
          setLoading(false);
          return;
        }

        // Severity distribution
        const severityMap: { [key: number]: number } = {};
        for (let i = 1; i <= 10; i++) {
          severityMap[i] = eventsWithDate.filter((event) => event.severity === i).length;
        }

        const severityDistribution = Object.entries(severityMap)
          .filter(([_, count]) => count > 0)
          .map(([severity, count]) => ({
            severity: parseInt(severity, 10),
            count,
          }));

        const averageSeverity =
          eventsWithDate.reduce((sum, event) => sum + event.severity, 0) / eventsWithDate.length;

        console.log('[Analysis] Severity distribution:', severityDistribution);
        console.log('[Analysis] Average severity:', averageSeverity);

        // Symptom correlations from migraine_events.symptoms
        const symptomCounter = new Map<string, number>();
        eventsWithDate.forEach((event) => {
          const symptoms = Array.isArray(event.symptoms) ? event.symptoms : [];
          symptoms.forEach((symptom) => {
            symptomCounter.set(symptom, (symptomCounter.get(symptom) || 0) + 1);
          });
        });

        const symptomCorrelations: CorrelationRow[] = Array.from(symptomCounter.entries()).map(
          ([factor, count]) => {
            const ratio = count / eventsWithDate.length;
            return {
              factor: `Symptom: ${factor}`,
              correlation: Math.min(1, ratio),
              frequency: ratio * 100,
            };
          }
        );

        console.log('[Analysis] Symptom correlations:', symptomCorrelations);

        const eventIds = eventsWithDate.map((event) => event.id);
        const eventIdSet = new Set(eventIds);

        // Load environment_snapshots
        console.log('[Analysis] Loading environment_snapshots for event IDs:', eventIds);
        const { data: envSnapshots, error: envError } = await supabase
          .from('environment_snapshots')
          .select(
            'event_id, pressure, pressure_change_6h, pressure_change_24h, pressure_6h_ago, pressure_12h_ago, pressure_24h_ago, pressure_48h_ago, temperature, temp_change_6h, humidity, wind_speed, uv_index, air_quality_pm25, season'
          )
          .in('event_id', eventIds);

        if (envError) {
          console.error('[Analysis] environment_snapshots query error:', envError);
          throw new Error(`environment_snapshots query failed: ${envError.message}`);
        }

        const envRows = (envSnapshots || []) as EnvironmentSnapshotRow[];
        console.log('[Analysis] Environment snapshots loaded:', envRows.length, envRows.slice(0, 3));

        const envEventIdSet = new Set(envRows.map((row) => row.event_id));
        const matchedEventIds = eventIds.filter((id) => envEventIdSet.has(id));
        const missingSnapshotEventIds = eventIds.filter((id) => !envEventIdSet.has(id));
        const orphanSnapshotEventIds = envRows
          .map((row) => row.event_id)
          .filter((id) => !eventIdSet.has(id));

        console.log('[Analysis] JOIN check migraine_events <-> environment_snapshots', {
          migraineEvents: eventsWithDate.length,
          environmentSnapshots: envRows.length,
          matchedEventIds: matchedEventIds.length,
          missingSnapshotEventIds: missingSnapshotEventIds.length,
          orphanSnapshotEventIds: orphanSnapshotEventIds.length,
          sampleMissingSnapshotEventIds: missingSnapshotEventIds.slice(0, 10),
          sampleOrphanSnapshotEventIds: orphanSnapshotEventIds.slice(0, 10),
        });

        // Environment factor correlations
        const envCorrelations: CorrelationRow[] = [];

        // Pressure drop correlation
        if (envRows.length > 0) {
          const pressureDrops = envRows.filter(
            (row) => row.pressure_change_6h !== null && row.pressure_change_6h <= -1
          ).length;
          if (pressureDrops > 0) {
            envCorrelations.push({
              factor: 'Luftdruckabfall (≥1 hPa/6h)',
              correlation: pressureDrops / envRows.length,
              frequency: (pressureDrops / envRows.length) * 100,
            });
          }

          // High pressure
          const highPressure = envRows.filter((row) => row.pressure !== null && row.pressure >= 1013).length;
          if (highPressure > 0) {
            envCorrelations.push({
              factor: 'Hoher Luftdruck (≥1013 hPa)',
              correlation: highPressure / envRows.length,
              frequency: (highPressure / envRows.length) * 100,
            });
          }

          // Low pressure
          const lowPressure = envRows.filter((row) => row.pressure !== null && row.pressure < 1000).length;
          if (lowPressure > 0) {
            envCorrelations.push({
              factor: 'Niedriger Luftdruck (<1000 hPa)',
              correlation: lowPressure / envRows.length,
              frequency: (lowPressure / envRows.length) * 100,
            });
          }

          // Temperature change
          const tempChange = envRows.filter(
            (row) => row.temp_change_6h !== null && Math.abs(row.temp_change_6h) >= 3
          ).length;
          if (tempChange > 0) {
            envCorrelations.push({
              factor: 'Temperaturwechsel (≥3°C/6h)',
              correlation: tempChange / envRows.length,
              frequency: (tempChange / envRows.length) * 100,
            });
          }

          // High humidity
          const highHumidity = envRows.filter((row) => row.humidity !== null && row.humidity >= 80).length;
          if (highHumidity > 0) {
            envCorrelations.push({
              factor: 'Hohe Luftfeuchte (≥80%)',
              correlation: highHumidity / envRows.length,
              frequency: (highHumidity / envRows.length) * 100,
            });
          }

          // High UV
          const highUV = envRows.filter((row) => row.uv_index !== null && row.uv_index >= 7).length;
          if (highUV > 0) {
            envCorrelations.push({
              factor: 'Hohe UV-Belastung (≥7)',
              correlation: highUV / envRows.length,
              frequency: (highUV / envRows.length) * 100,
            });
          }

          // High wind
          const highWind = envRows.filter((row) => row.wind_speed !== null && row.wind_speed >= 40).length;
          if (highWind > 0) {
            envCorrelations.push({
              factor: 'Starker Wind (≥40 km/h)',
              correlation: highWind / envRows.length,
              frequency: (highWind / envRows.length) * 100,
            });
          }

          // Poor air quality
          const poorAQ = envRows.filter(
            (row) => row.air_quality_pm25 !== null && row.air_quality_pm25 >= 35
          ).length;
          if (poorAQ > 0) {
            envCorrelations.push({
              factor: 'Hohe PM2.5 (≥35 µg/m³)',
              correlation: poorAQ / envRows.length,
              frequency: (poorAQ / envRows.length) * 100,
            });
          }
        }

        console.log('[Analysis] Environment correlations:', envCorrelations);

        const lagCandidates = envRows
          .map((row) => {
            let change6h = row.pressure_change_6h;
            if (
              (change6h === null || !Number.isFinite(change6h)) &&
              row.pressure !== null &&
              row.pressure_6h_ago !== null
            ) {
              change6h = row.pressure - row.pressure_6h_ago;
            }

            if (change6h === null || !Number.isFinite(change6h)) {
              return null;
            }

            return change6h;
          })
          .filter((value): value is number => value !== null);

        const lagData =
          lagCandidates.length > 0
            ? [
                {
                  hourBefore: 6,
                  averagePressureChange:
                    lagCandidates.reduce((sum, value) => sum + value, 0) / lagCandidates.length,
                  frequency: (lagCandidates.length / Math.max(envRows.length, 1)) * 100,
                },
              ]
            : [];

        console.log('[Analysis] Pressure lag data (6h):', {
          lagSampleCount: lagCandidates.length,
          totalEnvRows: envRows.length,
          lagData,
        });

        // Load personal factors
        console.log('[Analysis] Loading personal_factors...');
        const { data: personalFactors, error: personalError } = await supabase
          .from('personal_factors')
          .select(
            'event_id, sleep_hours, stress_level, alcohol_yesterday, caffeine_withdrawal, hydration, sensory_overload, masking_intensity, social_exhaustion, overstimulation'
          )
          .in('event_id', eventIds);

        if (personalError) {
          console.error('[Analysis] personal_factors query error:', personalError);
          throw new Error(`personal_factors query failed: ${personalError.message}`);
        }

        const personalRows = (personalFactors || []) as PersonalFactorRow[];
        console.log('[Analysis] Personal factors loaded:', personalRows.length, personalRows.slice(0, 3));

        const hasPersonalFactors = personalRows.length > 0;

        // Neurodiversity correlations
        const neuroDefs: Array<{
          factor: string;
          key: keyof Pick<
            PersonalFactorRow,
            'sensory_overload' | 'masking_intensity' | 'social_exhaustion' | 'overstimulation'
          >;
        }> = [
          { factor: 'Sensorische Überlastung', key: 'sensory_overload' },
          { factor: 'Masking-Intensität', key: 'masking_intensity' },
          { factor: 'Soziale Erschöpfung', key: 'social_exhaustion' },
          { factor: 'Überstimulation', key: 'overstimulation' },
        ];

        const neurodivergence: NeuroRow[] = neuroDefs
          .map((def) => {
            const values = personalRows
              .map((row) => row[def.key])
              .filter((value): value is number => value !== null);

            if (values.length === 0) {
              return null;
            }

            const averageScore = values.reduce((sum, value) => sum + value, 0) / values.length;
            return {
              factor: def.factor,
              averageScore,
              correlation: Math.min(1, averageScore / 5),
            };
          })
          .filter((row): row is NeuroRow => row !== null);

        console.log('[Analysis] Neurodiversity correlations:', neurodivergence);

        // Combine correlations (migraine_events + environment_snapshots only)
        const combinedCorrelations = [...symptomCorrelations, ...envCorrelations]
          .sort((a, b) => b.correlation - a.correlation)
          .slice(0, 10);

        console.log('[Analysis] Final correlations:', combinedCorrelations);

        setStats({
          totalEvents: eventsWithDate.length,
          averageSeverity,
          severityDistribution,
          correlations: combinedCorrelations,
          lagData,
          neurodivergence,
          hasPersonalFactors,
        });

        setErrorMessage(null);
        setLoading(false);
      } catch (error) {
        console.error('[Analysis] Error loading analysis:', error);
        setErrorMessage(
          error instanceof Error
            ? `Fehler: ${error.message}`
            : 'Daten konnten nicht geladen werden. Bitte Supabase-Konfiguration prüfen.'
        );
        setLoading(false);
      }
    };

    loadAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white/40 rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Lädt Analyse...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-main max-w-6xl mx-auto dashboard-container py-8">
        {errorMessage && (
          <div className="glass-card p-4 mb-6 border border-[var(--accent-high)]">
            <p className="text-sm text-[var(--text-primary)]">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="glass-card p-6">
            <p className="text-[var(--text-secondary)] text-sm mb-2">Gesamtereignisse</p>
            <p className="text-4xl font-bold text-[var(--text-primary)] mono-value">{stats.totalEvents}</p>
          </div>

          <div className="glass-card p-6">
            <p className="text-[var(--text-secondary)] text-sm mb-2">Ø Schweregrad</p>
            <p className="text-4xl font-bold text-[var(--text-primary)] mono-value">
              {stats.averageSeverity ? `${stats.averageSeverity.toFixed(1)}/10` : '—'}
            </p>
          </div>
        </div>

        {stats.severityDistribution.length > 0 && (
          <div className="mb-6">
            <SeverityChart data={stats.severityDistribution} />
          </div>
        )}

        <div className="mb-6">
          <CorrelationTable data={stats.correlations} />
        </div>

        <div className="mb-6">
          <LagAnalysis data={stats.lagData} />
        </div>

        {stats.hasPersonalFactors && (
          <div className="mb-6">
            <NeurodivergenceChart data={stats.neurodivergence} />
          </div>
        )}
      </div>
    </div>
  );
}
