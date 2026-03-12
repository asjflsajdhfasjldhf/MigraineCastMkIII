// HourlyTable Component - 72-hour forecast table
'use client';

import React from 'react';
import { HourlyForecast } from '@/types';

interface HourlyTableProps {
  data: HourlyForecast[];
}

export const HourlyTable: React.FC<HourlyTableProps> = ({ data }) => {
  const formatPressureDelta = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '→';
    return `${arrow} ${Math.abs(value).toFixed(1)}`;
  };

  const getRiskLabel = (level: HourlyForecast['krii_level']) => {
    if (level === 'high') return 'Hoch';
    if (level === 'medium') return 'Mittel';
    return 'Niedrig';
  };

  return (
    <div className="w-full glass-card p-6 overflow-x-auto">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
        72-Stunden-Vorschau
      </h2>

      {data.length === 0 ? (
        <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
      ) : (
        <table className="w-full min-w-[1120px] text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-2 text-[var(--text-secondary)]">Uhrzeit</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">KRII %</th>
              <th className="text-left py-2 px-2 text-[var(--text-secondary)]">Stufe</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Temp °C</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Luftdruck hPa</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Druckaenderung 6h</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Luftfeuchtigkeit %</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Wind km/h</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">UV-Index</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">PM2.5</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">NO2</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Ozon</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 72).map((hour, idx) => {
              const time = new Date(hour.time);
              const timeStr = time.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const riskColor =
                hour.krii_level === 'high'
                  ? 'text-[var(--accent-high)]'
                  : hour.krii_level === 'medium'
                    ? 'text-[var(--accent-medium)]'
                    : 'text-[var(--accent-neutral)]';

              return (
                <tr
                  key={idx}
                  className="border-b border-white/8 hover:bg-white/5"
                  style={{
                    boxShadow:
                      hour.krii_value > 0.6
                        ? 'inset 2px 0 0 0 color-mix(in oklab, var(--accent-high) 70%, transparent)'
                        : undefined,
                  }}
                >
                  <td className="py-2 px-2 text-[var(--text-primary)]">{timeStr}</td>
                  <td className={`py-2 px-2 text-right font-semibold mono-value ${riskColor}`}>
                    {Math.round(hour.krii_value * 100)}%
                  </td>
                  <td className="py-2 px-2 text-left text-[var(--text-secondary)]">
                    {getRiskLabel(hour.krii_level)}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {hour.temperature.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {hour.pressure.toFixed(0)}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {formatPressureDelta(hour.pressure_change_6h)}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {hour.humidity}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {hour.wind_speed.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {hour.uv_index !== null && hour.uv_index !== undefined ? hour.uv_index.toFixed(1) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {hour.pm25 !== null ? hour.pm25.toFixed(1) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {hour.no2 !== null && hour.no2 !== undefined ? hour.no2.toFixed(1) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {hour.ozone !== null && hour.ozone !== undefined ? hour.ozone.toFixed(1) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
