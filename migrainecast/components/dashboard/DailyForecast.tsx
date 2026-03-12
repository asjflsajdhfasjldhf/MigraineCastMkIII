// DailyForecast Component - 5-day forecast
'use client';

import React from 'react';
import { DailyForecast as DailyForecastType } from '@/types';

interface DailyForecastProps {
  data: DailyForecastType[];
}

export const DailyForecast: React.FC<DailyForecastProps> = ({ data }) => {
  const pressureTrendLabel = (trend?: 'falling' | 'stable' | 'rising') => {
    if (trend === 'falling') return 'fallend';
    if (trend === 'rising') return 'steigend';
    return 'stabil';
  };

  return (
    <div className="w-full glass-card p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
        5-Tage-Vorschau
      </h2>

      {data.length === 0 ? (
        <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
      ) : (
        <div className="dashboard-forecast-grid">
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
                  : 'var(--accent-neutral)';

                const borderColor = day.krii_peak > 0.3 ? riskColor : 'rgba(255, 255, 255, 0.08)';

            return (
              <div
                key={idx}
                className="glass-card p-4"
                style={{ borderColor }}
              >
                <p className="text-sm font-medium mb-3 text-[var(--text-primary)]">{dateStr}</p>
                <div className="mb-3">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">KRII-Peak</p>
                  <p className="text-2xl font-bold mono-value" style={{ color: riskColor }}>
                    {Math.round(day.krii_peak * 100)}%
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Stufe: {day.krii_level}</p>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  <p>↑ {day.temperature_max.toFixed(0)}°C</p>
                  <p>↓ {day.temperature_min.toFixed(0)}°C</p>
                  <p>Drucktrend: {pressureTrendLabel(day.pressure_trend)}</p>
                  <p className="truncate">Hauptrisikofaktor: {day.top_trigger || '—'}</p>
                  <p>Luftqualitaet PM2.5: {day.pm25 !== null && day.pm25 !== undefined ? day.pm25.toFixed(1) : '—'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
