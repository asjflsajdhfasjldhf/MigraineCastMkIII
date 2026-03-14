'use client';

import React, { useMemo, useState } from 'react';
import { HourlyForecast, MigraineEvent } from '@/types';
import { roundPercentValue } from '@/lib/krii-display';

interface RiskProfileChartProps {
  data: HourlyForecast[];
  events: MigraineEvent[];
}

export const RiskProfileChart: React.FC<RiskProfileChartProps> = ({ data, events }) => {
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const toLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = useMemo(() => {
    const forecastAverages = new Map<string, number>();
    const forecastBuckets = new Map<string, number[]>();
    data.slice(0, 72).forEach((hour) => {
      const date = new Date(hour.time);
      const key = toLocalDateKey(date);
      const bucket = forecastBuckets.get(key) ?? [];
      bucket.push((hour.krii_value ?? 0) * 100);
      forecastBuckets.set(key, bucket);
    });

    forecastBuckets.forEach((values, key) => {
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      forecastAverages.set(key, avg);
    });

    const eventBuckets = new Map<string, MigraineEvent[]>();
    events.forEach((event) => {
      const key = toLocalDateKey(new Date(event.started_at));
      const bucket = eventBuckets.get(key) ?? [];
      bucket.push(event);
      eventBuckets.set(key, bucket);
    });

    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 29 + index);
      const key = toLocalDateKey(date);
      const isToday = key === toLocalDateKey(today);
      const dayEvents = eventBuckets.get(key) ?? [];
      const severityAverage =
        dayEvents.length > 0
          ? dayEvents.reduce((sum, event) => sum + event.severity, 0) / dayEvents.length
          : null;
      const forecastAverage = forecastAverages.get(key);
      const value = forecastAverage ?? (severityAverage !== null ? severityAverage * 10 : 0);

      return {
        key,
        date,
        value: Math.max(0, Math.min(100, value)),
        hasMigraine: dayEvents.length > 0,
        hasForecast: forecastAverage !== undefined,
        severityAverage,
        displayLabel: isToday ? 'Heute' : null,
      };
    });
  }, [data, events]);

  const selectedDay = days.find((day) => day.key === selectedDayKey) ?? null;

  const formatShortLabel = (date: Date) => `${date.getDate()}.${date.getMonth() + 1}`;

  const getForecastColor = (value: number) => {
    if (value < 40) return 'rgba(255,255,255,0.4)';
    if (value <= 60) return 'rgba(251,146,60,0.8)';
    return 'rgba(248,113,113,0.8)';
  };

  const getBarColor = (day: (typeof days)[number]) => {
    if (day.hasMigraine) return '#f87171';
    if (day.hasForecast) return getForecastColor(day.value);
    return 'rgba(255,255,255,0.08)';
  };

  const getTooltipValue = (day: (typeof days)[number]) => {
    if (day.hasForecast) {
      return `KRII ${roundPercentValue(day.value)}%`;
    }
    if (day.severityAverage !== null) {
      return `Schweregrad ${day.severityAverage.toFixed(1)} / 10`;
    }
    return 'Keine Daten';
  };

  return (
    <div className="w-full glass-card overflow-hidden">
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">30 Tage</h2>
      </div>

      <div className="relative w-full px-3 pb-3">
        {selectedDay && (
          <div className="absolute left-3 top-0 z-10 rounded-lg border border-white/10 bg-[rgba(10,12,18,0.92)] px-3 py-2 text-xs text-[var(--text-primary)] shadow-lg">
            <p>{selectedDay.date.toLocaleDateString('de-DE')}</p>
            <p className="text-[var(--text-secondary)]">{getTooltipValue(selectedDay)}</p>
          </div>
        )}

        <div className="flex h-[100px] md:h-[120px] items-end gap-[2px] pt-8" role="img" aria-label="30-Tage-KRII-Uebersicht">
          {days.map((day) => {
            const minHeight = day.hasForecast || day.hasMigraine ? 3 : 2;
            const heightPercent = Math.max(day.value, minHeight);

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDayKey((current) => (current === day.key ? null : day.key))}
                className="flex h-full flex-1 items-end bg-transparent p-0"
                aria-label={`${day.date.toLocaleDateString('de-DE')} ${getTooltipValue(day)}`}
              >
                <div className="relative flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t-[2px] transition-opacity duration-150"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: getBarColor(day),
                      opacity: selectedDayKey === null || selectedDayKey === day.key ? 1 : 0.72,
                    }}
                  />
                  {day.hasMigraine && (
                    <span
                      className="absolute left-1/2 top-0 h-[5px] w-[5px] -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: '#f87171' }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex gap-[2px]">
          {days.map((day, index) => {
            const label = index === days.length - 1 ? 'Heute' : index % 7 === 0 ? formatShortLabel(day.date) : '';
            return (
              <div
                key={`${day.key}-label`}
                className="flex-1 text-center text-[10px] leading-none"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
