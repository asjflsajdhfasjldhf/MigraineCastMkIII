// Analysis Page
'use client';

import { useEffect, useState } from 'react';
import { CorrelationTable } from '@/components/analysis/CorrelationTable';
import { SeverityChart } from '@/components/analysis/SeverityChart';
import { LagAnalysis } from '@/components/analysis/LagAnalysis';
import { NeurodivergenceChart } from '@/components/analysis/NeurodivergenceChart';
import { getMigraineEvents, supabase } from '@/lib/supabase';
import { MigraineEvent } from '@/types';

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
  neurodivergence: NeuroRow[];
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

export default function AnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalysisStats>({
    totalEvents: 0,
    averageSeverity: 0,
    severityDistribution: [],
    correlations: [],
    neurodivergence: [],
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const fetchedEvents = await getMigraineEvents();
        const eventsWithDate = fetchedEvents.filter((event) => Boolean(event.started_at));

        if (eventsWithDate.length === 0) {
          setStats({
            totalEvents: 0,
            averageSeverity: 0,
            correlations: [],
            severityDistribution: [],
            neurodivergence: [],
          });
          setErrorMessage(null);
          setLoading(false);
          return;
        }

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

        const symptomCounter = new Map<string, number>();
        eventsWithDate.forEach((event) => {
          event.symptoms.forEach((symptom) => {
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

        const eventIds = eventsWithDate.map((event) => event.id);
        const { data: personalFactors, error: personalError } = await supabase
          .from('personal_factors')
          .select(
            'event_id, sleep_hours, stress_level, alcohol_yesterday, caffeine_withdrawal, hydration, sensory_overload, masking_intensity, social_exhaustion, overstimulation'
          )
          .in('event_id', eventIds);

        if (personalError) {
          throw new Error(`personal_factors query failed: ${personalError.message}`);
        }

        const personalRows = (personalFactors || []) as PersonalFactorRow[];

        const personalTriggerDefs: Array<{
          label: string;
          pick: (row: PersonalFactorRow) => boolean;
        }> = [
          { label: 'Hoher Stress (>=4)', pick: (row) => (row.stress_level ?? 0) >= 4 },
          { label: 'Wenig Schlaf (<6.5h)', pick: (row) => (row.sleep_hours ?? 99) < 6.5 },
          { label: 'Niedrige Hydration (<=2)', pick: (row) => (row.hydration ?? 99) <= 2 },
          { label: 'Alkohol am Vortag', pick: (row) => row.alcohol_yesterday === true },
          { label: 'Koffeinentzug', pick: (row) => row.caffeine_withdrawal === true },
        ];

        const personalCorrelations: CorrelationRow[] =
          personalRows.length === 0
            ? []
            : personalTriggerDefs.map((def) => {
                const matching = personalRows.filter(def.pick).length;
                const ratio = matching / personalRows.length;
                return {
                  factor: def.label,
                  correlation: Math.min(1, ratio),
                  frequency: ratio * 100,
                };
              });

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

        const combinedCorrelations = [...symptomCorrelations, ...personalCorrelations]
          .sort((a, b) => b.correlation - a.correlation)
          .slice(0, 10);

        setStats({
          totalEvents: eventsWithDate.length,
          averageSeverity,
          severityDistribution,
          correlations: combinedCorrelations,
          neurodivergence,
        });

        setErrorMessage(null);
        setLoading(false);
      } catch (error) {
        console.error('Error loading analysis:', error);
        setErrorMessage('Daten konnten nicht geladen werden. Bitte Supabase-Konfiguration prüfen.');
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
          <LagAnalysis data={[]} />
        </div>

        <div className="mb-6">
          <NeurodivergenceChart data={stats.neurodivergence} />
        </div>
      </div>
    </div>
  );
}
