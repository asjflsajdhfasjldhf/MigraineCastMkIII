// Analysis Page
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CorrelationTable } from '@/components/analysis/CorrelationTable';
import { SeverityChart } from '@/components/analysis/SeverityChart';
import { LagAnalysis } from '@/components/analysis/LagAnalysis';
import { NeurodivergenceChart } from '@/components/analysis/NeurodivergenceChart';
import { getMigraineEvents } from '@/lib/supabase';
import { MigraineEvent } from '@/types';

export default function AnalysisPage() {
  const [events, setEvents] = useState<MigraineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const fetchedEvents = await getMigraineEvents();
        setEvents(fetchedEvents);

        // Calculate statistics
        const completeEvents = fetchedEvents.filter((e) => e.stage === 'complete');

        if (completeEvents.length === 0) {
          setStats({
            totalEvents: 0,
            averageSeverity: 0,
            correlations: [],
            severityDistribution: [],
          });
          setLoading(false);
          return;
        }

        // Severity distribution
        const severityMap: { [key: number]: number } = {};
        for (let i = 1; i <= 10; i++) {
          severityMap[i] = completeEvents.filter(
            (e) => e.severity === i
          ).length;
        }

        const severityDistribution = Object.entries(severityMap)
          .filter(([_, count]) => count > 0)
          .map(([severity, count]) => ({
            severity: parseInt(severity),
            count,
          }));

        // Average stats
        const averageSeverity =
          completeEvents.reduce((sum, e) => sum + e.severity, 0) /
          completeEvents.length;

        setStats({
          totalEvents: completeEvents.length,
          averageSeverity,
          severityDistribution,
          correlations: [], // Will be updated with real data
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading analysis:', error);
        setLoading(false);
      }
    };

    loadAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Lädt Analyse...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Navigation */}
      <nav className="app-nav">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">🧠 MigraineCast</h1>
          <div className="flex gap-4">
            <Link
              href="/"
              className="nav-link"
            >
              Dashboard
            </Link>
            <Link
              href="/journal"
              className="nav-link"
            >
              Tagebuch
            </Link>
            <Link
              href="/analysis"
              className="nav-link active"
            >
              Analyse
            </Link>
            <Link
              href="/settings"
              className="nav-link"
            >
              Einstellungen
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="glass-card p-6">
            <p className="text-[var(--text-secondary)] text-sm mb-2">Gesamtereignisse</p>
            <p className="text-4xl font-bold text-[var(--text-primary)] mono-value">
              {stats?.totalEvents || 0}
            </p>
          </div>

          <div className="glass-card p-6">
            <p className="text-[var(--text-secondary)] text-sm mb-2">Ø Schweregrad</p>
            <p className="text-4xl font-bold text-[var(--text-primary)] mono-value">
              {stats?.averageSeverity?.toFixed(1) || '—'}/10
            </p>
          </div>
        </div>

        {/* Severity Distribution */}
        {stats?.severityDistribution?.length > 0 && (
          <div className="mb-6">
            <SeverityChart data={stats.severityDistribution} />
          </div>
        )}

        {/* Data Message */}
        {stats?.totalEvents < 10 && (
          <div className="glass-card p-4 mb-6">
            <p className="text-[var(--text-secondary)] text-sm">
              <span className="font-medium">ℹ️ Hinweis:</span> Sie haben{' '}
              {stats?.totalEvents || 0} Einträge. Ab etwa 50 Einträgen können
              detailliertere Analysen und ein personalisiertes ML-Modell
              trainiert werden.
            </p>
          </div>
        )}

        {/* Correlation Table */}
        <div className="mb-6">
          <CorrelationTable data={stats?.correlations || []} />
        </div>

        {/* Lag Analysis */}
        <div className="mb-6">
          <LagAnalysis data={[]} />
        </div>

        {/* Neurodiversity Chart */}
        <div className="mb-6">
          <NeurodivergenceChart data={[]} />
        </div>
      </div>
    </div>
  );
}
