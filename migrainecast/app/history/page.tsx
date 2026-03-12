'use client';

import { useEffect, useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { getMigraineEvents, getUserSettings, supabase } from '@/lib/supabase';
import { MigraineEvent } from '@/types';

interface EnvRow {
  event_id: string;
  pressure_trend: 'falling' | 'stable' | 'rising' | null;
  pressure_change_6h: number | null;
  temp_change_6h: number | null;
  air_quality_pm25: number | null;
}

interface MedicationRow {
  event_id: string;
  name: string;
  effectiveness: number | null;
}

interface PersonalRow {
  event_id: string;
  sensory_overload: number | null;
  masking_intensity: number | null;
  social_exhaustion: number | null;
  overstimulation: number | null;
}

export default function HistoryPage() {
  const [events, setEvents] = useState<MigraineEvent[]>([]);
  const [envRows, setEnvRows] = useState<EnvRow[]>([]);
  const [medRows, setMedRows] = useState<MedicationRow[]>([]);
  const [personalRows, setPersonalRows] = useState<PersonalRow[]>([]);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [fetchedEvents, settings] = await Promise.all([
          getMigraineEvents(),
          getUserSettings().catch(() => ({ location_name: 'Berlin' })),
        ]);

        setEvents(fetchedEvents);
        setUserLocation(settings.location_name || 'Berlin');
        setErrorMessage(null);

        if (fetchedEvents.length > 0) {
          const eventIds = fetchedEvents.map((event) => event.id);

          const [envResult, medsResult, personalResult] = await Promise.all([
            supabase
              .from('environment_snapshots')
              .select('event_id, pressure_trend, pressure_change_6h, temp_change_6h, air_quality_pm25')
              .in('event_id', eventIds),
            supabase
              .from('medications')
              .select('event_id, name, effectiveness')
              .in('event_id', eventIds),
            supabase
              .from('personal_factors')
              .select('event_id, sensory_overload, masking_intensity, social_exhaustion, overstimulation')
              .in('event_id', eventIds),
          ]);

          if (envResult.error) {
            console.error('Error loading environment_snapshots for history:', envResult.error);
          }
          if (medsResult.error) {
            console.error('Error loading medications for history:', medsResult.error);
          }
          if (personalResult.error) {
            console.error('Error loading personal_factors for history:', personalResult.error);
          }

          setEnvRows((envResult.data || []) as EnvRow[]);
          setMedRows((medsResult.data || []) as MedicationRow[]);
          setPersonalRows((personalResult.data || []) as PersonalRow[]);
        }
      } catch (error) {
        console.error('Error loading history page:', error);
        setErrorMessage('Verlaufsdaten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const completeEvents = useMemo(
    () => events.filter((event) => event.stage === 'complete'),
    [events]
  );

  const monthlyStats = useMemo(() => {
    if (completeEvents.length === 0) {
      return {
        lastAttackDays: null,
        thisMonthCount: 0,
        avgPerMonth: 0,
        longestMigraineFree: 0,
      };
    }

    const sortedAsc = [...completeEvents].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );
    const newest = sortedAsc[sortedAsc.length - 1];
    const now = new Date();
    const lastAttackDays = Math.floor(
      (now.getTime() - new Date(newest.started_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const thisMonthCount = completeEvents.filter((event) => {
      const d = new Date(event.started_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const byMonth = new Map<string, number>();
    completeEvents.forEach((event) => {
      const d = new Date(event.started_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      byMonth.set(key, (byMonth.get(key) || 0) + 1);
    });

    const avgPerMonth = byMonth.size > 0
      ? Array.from(byMonth.values()).reduce((sum, value) => sum + value, 0) / byMonth.size
      : 0;

    let longestMigraineFree = 0;
    for (let i = 1; i < sortedAsc.length; i++) {
      const prev = new Date(sortedAsc[i - 1].started_at).getTime();
      const curr = new Date(sortedAsc[i].started_at).getTime();
      const diffDays = Math.floor((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays > longestMigraineFree) {
        longestMigraineFree = diffDays;
      }
    }

    return {
      lastAttackDays,
      thisMonthCount,
      avgPerMonth,
      longestMigraineFree,
    };
  }, [completeEvents]);

  const triggerStats = useMemo(() => {
    if (completeEvents.length === 0 || envRows.length === 0) return [] as Array<{ name: string; pct: number }>;

    const counter = new Map<string, number>();

    envRows.forEach((row) => {
      if (row.pressure_trend === 'falling' || (row.pressure_change_6h ?? 0) <= -3) {
        counter.set('Fallender Luftdruck', (counter.get('Fallender Luftdruck') || 0) + 1);
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
        pct: (count / completeEvents.length) * 100,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [completeEvents, envRows]);

  const symptomStats = useMemo(() => {
    const counter = new Map<string, number>();

    completeEvents.forEach((event) => {
      event.symptoms.forEach((symptom) => {
        counter.set(symptom, (counter.get(symptom) || 0) + 1);
      });
    });

    return Array.from(counter.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [completeEvents]);

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
        const parts = [row.sensory_overload, row.masking_intensity, row.social_exhaustion, row.overstimulation]
          .filter((value): value is number => value !== null);
        if (parts.length === 0) return null;
        return parts.reduce((sum, v) => sum + v, 0) / parts.length;
      })
      .filter((value): value is number => value !== null);

    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }, [personalRows]);

  const calendarData = useMemo(() => {
    const year = visibleMonthDate.getFullYear();
    const month = visibleMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const byDate = new Map<string, MigraineEvent[]>();
    completeEvents.forEach((event) => {
      const dateKey = new Date(event.started_at).toISOString().slice(0, 10);
      const list = byDate.get(dateKey) || [];
      list.push(event);
      byDate.set(dateKey, list);
    });

    const cells: Array<{ date: string | null; severity: number | null; count: number }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, severity: null, count: 0 });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = date.toISOString().slice(0, 10);
      const entries = byDate.get(key) || [];
      const maxSeverity = entries.length > 0
        ? Math.max(...entries.map((entry) => entry.severity))
        : null;

      cells.push({
        date: key,
        severity: maxSeverity,
        count: entries.length,
      });
    }

    return {
      year,
      month,
      monthLabel: visibleMonthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
      cells,
      byDate,
    };
  }, [completeEvents, visibleMonthDate]);

  const canGoNextMonth = useMemo(() => {
    const now = new Date();
    return (
      visibleMonthDate.getFullYear() < now.getFullYear() ||
      (visibleMonthDate.getFullYear() === now.getFullYear() && visibleMonthDate.getMonth() < now.getMonth())
    );
  }, [visibleMonthDate]);

  const selectedEntries = useMemo(() => {
    if (!selectedDate) return [] as MigraineEvent[];
    return calendarData.byDate.get(selectedDate) || [];
  }, [selectedDate, calendarData]);

  const hasEnvironmentData = envRows.length > 0;

  const monthlySeveritySeries = useMemo(() => {
    const grouped = new Map<string, { sum: number; count: number }>();

    completeEvents.forEach((event) => {
      const d = new Date(event.started_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const current = grouped.get(key) || { sum: 0, count: 0 };
      grouped.set(key, { sum: current.sum + event.severity, count: current.count + 1 });
    });

    return Array.from(grouped.entries())
      .map(([month, value]) => ({ month, avg: value.sum / value.count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [completeEvents]);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Lade Verlauf...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navigation showLocationPin={true} locationName={userLocation} />

      <div className="app-main max-w-6xl mx-auto dashboard-container py-8 space-y-6">
        {errorMessage && (
          <section className="glass-card p-4 border border-[var(--accent-high)]">
            <p className="text-sm text-[var(--text-primary)]">{errorMessage}</p>
          </section>
        )}

        <section className="glass-card p-6">
          <h2 className="text-xl font-medium mb-4">Schnellstatistiken</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">Letzte Attacke</p>
              <p className="text-2xl font-medium">{monthlyStats.lastAttackDays !== null ? `vor ${monthlyStats.lastAttackDays} Tagen` : '—'}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">Dieser Monat</p>
              <p className="text-2xl font-medium">{monthlyStats.thisMonthCount} Attacken</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">Durchschnitt</p>
              <p className="text-2xl font-medium">{monthlyStats.avgPerMonth.toFixed(1)} / Monat</p>
            </div>
            <div className="glass-card p-4">
                <p className="text-xs text-[var(--text-secondary)] mb-1">Längste migränefreie Phase</p>
              <p className="text-2xl font-medium">{monthlyStats.longestMigraineFree} Tage</p>
            </div>
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-medium mb-4">Kalender</h2>
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              className="ui-button"
              onClick={() => {
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
              <div key={day} className="text-center">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarData.cells.map((cell, idx) => {
              const intensity = cell.severity ? Math.min(0.12 + cell.severity * 0.06, 0.62) : 0;
              const isSelected = cell.date && selectedDate === cell.date;
              const today = new Date().toISOString().slice(0, 10);
              const isToday = cell.date === today;

              return (
                <button
                  key={`${cell.date || 'empty'}-${idx}`}
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
                      ? `rgba(252, 165, 165, ${intensity})`
                      : 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  {cell.date ? new Date(cell.date).getDate() : ''}
                </button>
              );
            })}
          </div>

          {selectedEntries.length > 0 && (
            <div className="mt-4 p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
              <p className="text-sm text-[var(--text-secondary)]">Popup-Detail {selectedDate}</p>
              {selectedEntries.map((event) => (
                <div key={event.id} className="text-sm border-t border-white/10 pt-2">
                  <p>Start: {new Date(event.started_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p>Schweregrad: {event.severity}/10</p>
                  <p className="truncate">Notiz: {event.notes || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-medium mb-4">Woran lag es meistens</h2>

          {!hasEnvironmentData ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Wird befüllt sobald neue Einträge mit Wetterdaten erfasst werden.
            </p>
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
                      <div className="h-full bg-[var(--accent-high)]" style={{ width: `${Math.min(item.pct, 100)}%` }} />
                    </div>
                  </div>
                ))}
                {triggerStats.length === 0 && <p className="text-sm text-[var(--text-secondary)]">Keine Triggerdaten verfügbar</p>}
              </div>
            </div>

            {monthlySeveritySeries.length > 1 && (
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-2">Durchschnittlicher Schweregrad pro Monat</p>
                <svg viewBox="0 0 320 120" className="w-full h-32 rounded-lg border border-white/10 bg-white/[0.02]">
                  {monthlySeveritySeries.map((point, index) => {
                    const x = (index / (monthlySeveritySeries.length - 1)) * 300 + 10;
                    const y = 110 - ((point.avg - 1) / 9) * 90;
                    const next = monthlySeveritySeries[index + 1];
                    if (!next) {
                      return (
                        <circle key={point.month} cx={x} cy={y} r="3" fill="var(--accent-medium)" />
                      );
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
      </div>
    </div>
  );
}
