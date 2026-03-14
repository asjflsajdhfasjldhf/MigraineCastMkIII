'use client';

import React from 'react';
import { HourlyForecast, MigraineEvent } from '@/types';

interface RiskProfileChartProps {
  data: HourlyForecast[];
  events: MigraineEvent[];
}

export const RiskProfileChart: React.FC<RiskProfileChartProps> = ({ data, events }) => {
  const toLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 29 + index);
    const key = toLocalDateKey(date);
    const isToday = key === toLocalDateKey(today);
    const isFutureFromToday = date > today;
    const dayEvents = eventBuckets.get(key) ?? [];
    const severityAverage =
      dayEvents.length > 0
        ? (dayEvents.reduce((sum, event) => sum + event.severity * 10, 0) / dayEvents.length)
        : 0;
    const forecastAverage = forecastAverages.get(key);
    const value = forecastAverage ?? severityAverage;

    return {
      key,
      date,
      value: Math.max(0, Math.min(100, value)),
      hasMigraine: dayEvents.length > 0,
      isToday,
      isFuture: isFutureFromToday,
    };
  });

  const width = 600;
  const height = 120;
  const topPadding = 10;
  const bottomPadding = 22;
  const plotHeight = height - topPadding - bottomPadding;
  const barStep = width / days.length;
  const barWidth = Math.max(4, barStep - 2);
  const maxX = width - barWidth;

  const toX = (idx: number) => Math.min(idx * barStep + (barStep - barWidth) / 2, maxX);
  const toBarHeight = (value: number) => (value / 100) * plotHeight;
  const labelDays = new Set([1, 8, 15, 22]);

  const barColor = (day: (typeof days)[number]) => {
    if (day.hasMigraine) return 'rgba(248,113,113,0.85)';
    return day.isFuture || day.isToday ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)';
  };

  return (
    <div className="w-full glass-card overflow-hidden">
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">30 Tage</h2>
      </div>

      <div className="w-full h-[100px] md:h-[120px]">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full block"
          role="img"
          aria-label="30-Tage-KRII-Uebersicht"
        >
          {days.map((day, index) => {
            const x = toX(index);
            const barHeight = toBarHeight(day.value);
            const y = topPadding + (plotHeight - barHeight);
            const label = day.isToday ? 'Heute' : labelDays.has(day.date.getDate()) ? `${day.date.getDate()}.` : null;

            return (
              <g key={day.key}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="2"
                  fill={barColor(day)}
                />
                {day.hasMigraine && (
                  <circle
                    cx={x + barWidth / 2}
                    cy={Math.max(4, y - 4)}
                    r="2.5"
                    fill="rgba(248,113,113,1)"
                  />
                )}
                {label && (
                  <text
                    x={x + barWidth / 2}
                    y={height - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fill="rgba(255,255,255,0.55)"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
