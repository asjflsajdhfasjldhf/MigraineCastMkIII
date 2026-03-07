// DailyForecast Component - 5-day forecast
'use client';

import React from 'react';
import { DailyForecast as DailyForecastType } from '@/types';

interface DailyForecastProps {
  data: DailyForecastType[];
}

export const DailyForecast: React.FC<DailyForecastProps> = ({ data }) => {
  return (
    <div className="w-full glass-card p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
        5-Tage-Vorschau
      </h2>

      {data.length === 0 ? (
        <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {data.slice(0, 5).map((day, idx) => {
            const date = new Date(day.date);
            const dateStr = date.toLocaleDateString('de-DE', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            const riskColor =
              day.krii_level === 'high'
                ? 'var(--accent-high)'
                : day.krii_level === 'medium'
                  ? 'var(--accent-medium)'
                  : 'var(--accent-low)';

            return (
              <div
                key={idx}
                className="glass-card p-4"
                style={{ borderColor: riskColor }}
              >
                <p className="text-sm font-medium mb-3 text-[var(--text-primary)]">{dateStr}</p>
                <div className="mb-3">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">KRII-Peak</p>
                  <p className="text-2xl font-bold mono-value" style={{ color: riskColor }}>
                    {Math.round(day.krii_peak * 100)}%
                  </p>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  <p>↑ {day.temperature_max.toFixed(0)}°C</p>
                  <p>↓ {day.temperature_min.toFixed(0)}°C</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
