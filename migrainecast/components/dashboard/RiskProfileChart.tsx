'use client';

import React, { useMemo, useState } from 'react';
import { HourlyForecast } from '@/types';
import { roundPercentValue } from '@/lib/krii-display';

interface RiskProfileChartProps {
  data: HourlyForecast[];
}

export const RiskProfileChart: React.FC<RiskProfileChartProps> = ({ data }) => {
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
    const forecastPeaks = new Map<string, number>();
    const forecastBuckets = new Map<string, number[]>();
    data.forEach((hour) => {
      const date = new Date(hour.time);
      const key = toLocalDateKey(date);
      const bucket = forecastBuckets.get(key) ?? [];
      bucket.push((hour.krii_value ?? 0) * 100);
      forecastBuckets.set(key, bucket);
    });

    forecastBuckets.forEach((values, key) => {
      const peak = values.reduce((max, value) => Math.max(max, value), 0);
      forecastPeaks.set(key, peak);
    });

    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const key = toLocalDateKey(date);
      const value = forecastPeaks.get(key) ?? 0;
      const isToday = index === 0;
      const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '');
      const shortDate = `${date.getDate()}.${date.getMonth() + 1}`;

      return {
        key,
        date,
        value: Math.max(0, Math.min(100, value)),
        isToday,
        label: isToday ? 'Heute' : `${weekday} ${shortDate}`,
      };
    });
  }, [data]);

  const selectedDay = days.find((day) => day.key === selectedDayKey) ?? null;

  const getBarColor = (value: number) => {
    if (value < 40) return 'rgba(255,255,255,0.5)';
    if (value <= 60) return 'rgba(251,146,60,0.8)';
    return 'rgba(248,113,113,0.8)';
  };

  const getTooltipValue = (day: (typeof days)[number]) => {
    return `KRII ${roundPercentValue(day.value)}%`;
  };

  return (
    <div className="w-full glass-card overflow-hidden">
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">14-Tage Forecast</h2>
      </div>

      <div className="relative w-full px-3 pb-3">
        {selectedDay && (
          <div className="absolute left-3 top-0 z-10 rounded-lg border border-white/10 bg-[rgba(10,12,18,0.92)] px-3 py-2 text-xs text-[var(--text-primary)] shadow-lg">
            <p>{selectedDay.date.toLocaleDateString('de-DE')}</p>
            <p className="text-[var(--text-secondary)]">{getTooltipValue(selectedDay)}</p>
          </div>
        )}

        <div className="flex h-[120px] items-end gap-[2px] pt-8" role="img" aria-label="14-Tage-KRII-Forecast">
          {days.map((day) => {
            const heightPercent = Math.max(day.value, 2);

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
                      backgroundColor: getBarColor(day.value),
                      border: day.isToday ? '1px solid rgba(255,255,255,0.9)' : '1px solid transparent',
                      boxSizing: 'border-box',
                      opacity: selectedDayKey === null || selectedDayKey === day.key ? 1 : 0.72,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex gap-[2px]">
          {days.map((day) => {
            return (
              <div
                key={`${day.key}-label`}
                className="flex-1 text-center text-[10px] leading-none"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {day.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
